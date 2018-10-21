import * as fs from 'fs';
import {createServer} from 'http';
import * as T from '@jonggrang/task';
import terminus from '@godaddy/terminus';

import {readAppSetings, createApplication} from './application';
import {installFoundation, foundation} from './foundation';
import {mongoClose} from './lib/mongodb';
import {redisQuit} from './lib/redis';

/**
 * Start thatiq server
 *
 * @param {String} configFile
 * @return {Task}
 */
export function startServer(configFile) {
  return readAppSetings(configFile)
    .chain(installFoundation)
    .chain(() => {
      // bind and set up termination action
      const server = createServer(createApplication());
      terminus(server, {
        healthChecks: {
          '/healthcheck': healthChecks
        },
        onSignal: onSignal,
        signals: ['SIGINT', 'SIGTERM', 'SIGUSR2']
      });

      // connect
      const bindSettings = foundation.settings.bind;
      if (bindSettings.path) return bindConnectionUnix(server, bindSettings);
      return T.node(server, bindSettings, server.listen);
    });
}

function healthChecks() {
  const admin = foundation.db.admin();
  return T.toPromise(T.sequencePar_([
    T.fromPromise(admin, admin.ping),
    redis.status === 'ready' ? T.pure(void 0) : T.raise(new Error('not ready'))
  ]))
}

function onSignal() {
  const {redis, mongoClient} = foundation;
  return T.toPromise(T.sequencePar_([
    mongoClose(mongoClient),
    redisQuit(redis)
  ]));
}

/**
 *
 * @param {http.Server} server
 * @param {String} path
 * @param {String|Number} permission
 * @param {Object} opts
 */
function bindConnectionUnix(server, opts) {
  return T.apathize(T.node(null, opts.path, fs.unlink))
    .chain(() => T.sequence_([
      T.node(server, opts, server.listen),
      T.node(null, opts.path, opts.permission || '660', fs.chmod)
    ]));
}

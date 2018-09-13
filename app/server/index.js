import * as fs from 'fs';
import {createServer, STATUS_CODES} from 'http';

import cookieParser from 'cookie-parser';
import express from 'express';
import expressPino from 'express-pino-logger';
import expressFlash from 'express-flash';
import session from 'express-session';
import createRedisStore from 'connect-redis';
import passport from 'passport';
import terminus from '@godaddy/terminus';
import * as T from '@jonggrang/task';
import { configure as createNunjuckConf } from 'nunjucks';

import {configurePassport} from './auth/passport';
import {loadDotenv} from './config/dotenv';
import {readConfig} from './config/parse';
import {SVGInlineExt} from './config/template';
import {createFoundation} from './foundation';
import {mongoClose} from './lib/mongodb';
import {redisQuit} from './lib/redis';
import {defineRoutes} from './routes';


export function startServer(configFile, envFile) {
  return T.co(function* () {
    const app = express();
    if (envFile) yield loadDotenv({path: envFile});

    const appSettings = yield readConfig(configFile);
    const foundation = yield createFoundation(appSettings);

    // settings for express
    app.disable('x-powered-by');
    app.set('trust proxy', 'loopback');
    app.locals.app = Object.create(null);
    app.locals.app.name = appSettings.app.name || 'Thatiq';
    app.locals.app.debug = appSettings.app.debug || false;

    configurePassport(foundation);

    const RedisStorage = createRedisStore(session);

    app.use(cookieParser(appSettings.app.key));
    app.use(session({
      store: new RedisStorage({client: foundation.redis}),
      secret: appSettings.app.key,
      proxy: true,
      resave: false,
      saveUninitialized: false,
      cookie: {
        name: appSettings.session.cookieName,
        httpOnly: appSettings.session.httpOnlyCookies,
        secure: appSettings.session.secureCookies,
        maxAge: appSettings.session.maxAge
      }
    }));
    app.use(expressFlash());
    app.use(expressPino({looger: foundation.looger}));
    app.use(express.static(appSettings.staticFiles.root));
    app.use(passport.initialize());

    configureNunjucks(app, appSettings);

    defineRoutes(foundation, app);

    // error handler
    app.use(createErrorHandler(foundation));

    // bind and set up termination action
    const server = createServer(app);
    terminus(server, {
      healthChecks: {
        '/healthcheck': createHealtCheck(foundation)
      },
      onSignal: createOnSignal(foundation),
      signals: ['SIGINT', 'SIGTERM', 'SIGUSR2']
    });

    // connect
    const bindSettings = appSettings.bind;
    if (bindSettings.path) return bindConnectionUnix(server, bindSettings);
    return T.node(server, appSettings.bind, server.listen);
  });
}

function createErrorHandler(foundation) {
  function renderErrorTemplate(res, tpl, error) {
    return T.makeTask_(cb => {
      const settings = foundation.settings || {};
      const appSettings = settings.app || {};
      const context = {
        error,
        title: STATUS_CODES[error.status] || 'Internal Server Error.',
        app: {
          name: appSettings.name || 'Thatiq',
          debug: typeof appSettings.debug !== 'boolean' ? false : appSettings.debug
        }
      };
      res.render(tpl, context, cb);
    });
  }

  function getAllTemplateErrors(codeStr) {
    let all = [];
    let item;
    for (let i = 0, len = codeStr.length; i < len; i++) {
      item = codeStr.slice(0, len - i);
      if (item.length !== len) item += 'x'.repeat(len - item.length)
      all.push(item)
    }
    return all;
  }

  return function errorHandler(err, req, res, next) {
    if (res.headerSent) return next(err);
    err = err | {};
    const codeStr = '' + (err.status || 500);

    res.log.warn({err});

    const task = getAllTemplateErrors(codeStr).reduce(
      (prev, current) => prev.alt(renderErrorTemplate(res, current + '.html', err)),
      T.raise(new Error('no template found'))
    );

    T.runTask(task, (error, html) => {
      if (error) return next(error);

      res.status(err.code || 500).send(html);
    });
  };
}

function createHealtCheck(foundation) {
  const {redis, db} = foundation;
  const admin = db.admin();
  return function healthcheck() {
    return T.toPromise(T.sequencePar_([
      T.fromPromise(admin, admin.ping),
      redis.status === 'ready' ? T.pure(void 0) : T.raise(new Error('not ready'))
    ]));
  };
}

function createOnSignal(foundation) {
  const {redis, mongoClient} = foundation;
  return function onSignal() {
    return T.toPromise(T.sequencePar_([
      mongoClose(mongoClient),
      redisQuit(redis)
    ]));
  };
}

function configureNunjucks(app, settings) {
  const viewSettings = settings.views || {};
  const staticSettings = settings.staticFiles || {};

  const env = createNunjuckConf(viewSettings.dir, {
    autoescape: viewSettings.autoescape,
    watch: viewSettings.watch,
    web: {
      useCache: viewSettings.useCache,
      async: true // use async
    },
    express: app
  });

  // we can configure env here
  env.addExtension('SVGInlineExtension', new SVGInlineExt(staticSettings));

  return env;
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

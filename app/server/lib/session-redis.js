import {inherits} from'util';

import {extend} from '../utils/object';


/**
 * One day in seconds.
 */
const oneDay = 86400;

function getTTL(store, sess, sid) {
  if (typeof store.ttl === 'number' || typeof store.ttl === 'string') return store.ttl;
  if (typeof store.ttl === 'function') return store.ttl(store, sess, sid);
  if (store.ttl) throw new TypeError('`store.ttl` must be a number or function.');

  const maxAge = sess.cookie.maxAge;
  return (typeof maxAge === 'number'
    ? Math.floor(maxAge / 1000)
    : oneDay);
}

function noop(){};

export function createRedisStore(session) {
  /**
   * Express's session Store.
   */
  const Store = session.Store;

  function RedisStore(options) {
    if (!(this instanceof RedisStore)) return new RedisStore(options);

    options = options || {};

    Store.call(this, options);

    this.prefix = options.prefix == null
      ? 'sess:'
      : options.prefix;
    delete options.prefix;

    this.scanCount = Number(options.scanCount) || 100;
    delete options.scanCount;

    this.serializer = options.serializer || JSON;

    if (options.url) {
      options.socket = options.url;
    }

    if (options.client) {
      this.client = options.client;
    } else {
      throw new Error('opts.client is required');
    }

    // logErrors
    if (options.logErrors) {
      // if options.logErrors is function, allow it to override. else provide default logger. useful for large scale deployment
      // which may need to write to a distributed log
      if (typeof options.logErrors !== 'function') {
        options.logErrors = function (err) {
          console.error('Warning: session-redis reported a client error: ' + err);
        };
      }
      this.client.on('error', options.logErrors);
    }

    this.ttl = options.ttl;
    this.disableTTL = options.disableTTL;

    if (options.unref) this.client.unref();

    if ('db' in options) {
      if (typeof options.db !== 'number') {
        console.error('Warning: session-redis expects a number for the "db" option');
      }

      this.client.select(options.db);
      this.client.on('connect', () => {
        this.client.select(options.db);
      });
    }

    this.client.on('error', (er) => {
      this.emit('disconnect', er);
    });

    this.client.on('connect', () => {
      this.emit('connect');
    });
  }

  inherits(RedisStore, Store);

    /**
   * Fetch all sessions' Redis keys using non-blocking SCAN command
   *
   * @param {Function} fn
   * @api private
   */

  function allKeys (store, cb) {
    const keysObj = {}; // Use an object to dedupe as scan can return duplicates
    const pattern = store.prefix + '*';
    const scanCount = store.scanCount;
    (function nextBatch (cursorId) {
      store.client.scan(cursorId, 'match', pattern, 'count', scanCount, (err, result) => {
        if (err) return cb(err);

        const nextCursorId = result[0];
        const keys = result[1];

        keys.forEach((key) => {
          keysObj[key] = 1;
        });

        if (nextCursorId != 0) {
          // next batch
          return nextBatch(nextCursorId);
        }

        // end of cursor
        return cb(null, Object.keys(keysObj));
      });
    })(0);
  }

  extend(RedisStore.prototype, {
    get(sid, cb) {
      const psid = this.prefix + sid;
      const {client, serializer} = this;
      cb = typeof cb === 'function' ? cb : noop;

      client.get(psid, (err, data) => {
        if (err) return cb(err);
        if (!data) return cb();

        data = data.toString();
        let result;
        try {
          result = serializer.parse(data);
        } catch (err) {
          return cb(err);
        }

        cb(null, result);
      });
    },

    set(sid, sess, cb) {
      const {client, serializer} = this;

      const args = [this.prefix + sid];
      cb = typeof cb === 'function' ? cb : noop;
      let jsess;
      try {
        jsess = serializer.stringify(sess);
      } catch (er) {
        return cb(er);
      }

      args.push(jsess);

      if (!this.disableTTL) {
        args.push('EX', getTTL(this, sess, sid));
      }

      client.set(args, (err) => {
        if (err) return cb(err);

        cb();
      });
    },

    destroy(sid, cb) {
      const {client, prefix} = this;
      cb = typeof cb === 'function' ? cb : noop;

      if (Array.isArray(sid)) {
        const multi = client.multi();
        sid.forEach(id => {
          multi.del(prefix + id);
        });
        multi.exec(cb);
      } else {
        sid = prefix + sid;
        client.del(sid, cb);
      }
    },

    touch(sid, sess, cb) {
      const {client, prefix} = this;
      const psid = prefix + sid;
      cb = typeof cb === 'function' ? cb : noop;
      if (this.disableTTL) return cb();

      const ttl = getTTL(this, sess);

      client.expire(psid, ttl, (err) => {
        if (err) return cb(err);

        cb();
      });
    },

    ids(cb) {
      const prefixLength = this.prefix.length;
      cb = typeof cb === 'function' ? cb : noop;

      allKeys(this, (err, keys) => {
        if (err) return cb(err);

        cb(null, keys.map(key => key.substr(prefixLength)));
      });
    },

    all(cb) {
      const {client, prefix, serializer} = this;
      const prefixLength = prefix.length;
      cb = typeof cb === 'function' ? cb : noop;

      allKeys(this, (err, keys) => {
        if (err) return cb(err);

        if (keys.length === 0) return cb(null, []);

        client.mget(keys, (err, sessions) => {
          if (err) return cb(err);
          let result;

          try {
            result = sessions.map((data, ix) => {
              data = data.toString();
              data = serializer.parse(data);
              data.id = keys[ix].substr(prefixLength);
              return data;
            });
          } catch (err) {
            return cb(err);
          }

          cb(null, result);
        });
      });
    }
  });

  return RedisStore;
}

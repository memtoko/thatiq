import Redis from 'ioredis';
import {makeTask_} from '@jonggrang/task';


/**
 * connect to redis
 *
 * @param {String} uri URI for connecting to redis
 * @returns {Task} Task that resolved with Redis
 */
export function redisConnect(uri) {
  return makeTask_(cb => {
    const redis = new Redis(uri);
    redis.on('ready', () => {
      cb(null, redis);
    });
  });
}

/**
 * quit redis connection
 *
 * @param {Redis} redis
 * @returns {Task}
 */
export function redisQuit(redis) {
  return makeTask_(cb => {
    redis.quit((err, ok) => {
      if (err) return cb(err);
      if (ok === 'OK') cb(null);
      cb(new Error('quit return ' + ok));
    });
  });
}

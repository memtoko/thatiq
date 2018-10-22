import {isLeft} from '@jonggrang/prelude';
import {node, pure, attempt, makeTask_} from '@jonggrang/task';


import {foundation} from '../../foundation';


function tokenLookupKey(userId, clientId) {
  return `${foundation.settings.redis.prefix}:token:s:${userId}:${clientId}`;
}

function tokenValidateKey(token) {
  return `${foundation.settings.redis.prefix}:token:t:${token}`
}

function getAnonymousTtl() {
  return foundation.settings.session.maxAge + 60;
}

export const tokenProvider = {
  getToken(userId, clientId) {
    if (!userId) return pure();

    const redis = foundation.redis;

    return node(redis, tokenLookupKey(userId, clientId), redis.get);
  },

  validateToken(token) {
    const redis = foundation.redis;
    const redisKey = tokenValidateKey(token);

    return attempt(node(redis, tredisKey, redis.get))
      .chain(eresult => {
        if (isLeft(eresult)) {
          foundation.logger.warn({err: eresult.value}, `redis token provider fail for ${token}`);

          return pure();
        }

        const value = eresult.value;

        if (!value) return pure();

        const parts = ("" + value).split(':', 2);
        const userId = parts[0] || null;
        const clientId = parts[1];

        if (!userId) {
          return node(redis, redisKey, getAnonymousTtl(), redis.expire)
            .catchError(err => {
              foundation.logger.warn({err}, 'redis token expire anoymous fail');

              return pure();
            });
        }

        return pure([userId, clientId]);
    });
  },

  cacheToken(userId, clientId, token) {
    return makeTask_(cb => {
      const multi = foundation.redis.multi();
      var ttl = userId ? 600 : getAnonymousTtl();

      multi.setex(tokenValidateKey(token), ttl, (userId || "") + ":" + clientId);

      if (userId) {
        multi.setex(tokenLookupKey(userId, clientId), ttl, token);
      }

      multi.exec(cb);
    });
  },

  deleteToken(token) {
    const redis = foundation.redis;

    return this.validateToken(token).chain(result => {
      if (result) return pure();

      const userId = result[0];
      const clientId = result[1];

      if (!userId) return node(redis, tokenValidateKey(token), redis.del);

      return node(redis, tokenLookupKey(userId, clientId), redis.del);
    });
  },

  invalidateCache() {
    const redis = foundation.redis;

    return node(redis, `${foundation.settings.redis.prefix}:token:*`, redis.keys)
      .chain(results => !results.length ? pure() : node(redis, results, redis.del));
  }
}

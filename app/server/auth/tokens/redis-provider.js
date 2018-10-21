import {node, raise} from '@jonggrang/task';

import {foundation} from '../../foundation';
import {redisMulti} from '../../lib/redis';
import {unixTime, fromHuman} from '../../utils/time';
import {TokenAlreadyExist, TokenDoesnotExist} from './error';


export class RedisTokenProvider {
  constructor(redis, opts) {
    this.redis = redis;
    this.prefix = opts.prefix;
  }

  userKey(user) {
    return `${this.prefix}:userTokens:${user}`;
  }

  tokenKey(token) {
    return `${this.prefix}:tokens:${token};`
  }

  get(token) {
    return node(this.redis, this.tokenKey(token), this.redis.hgetall)
      .map(hash => parseToken(token, hash));
  }

  insert(userId, token, opts) {
    return this.get(token).chain(existingToken => {
      if (existingToken) return raise(new TokenAlreadyExist(existingToken, token));
      opts = opts || {};
      let ttl;
      if (opts.expiresIn) {
        ttl = Math.floor(fromHuman(opts.expiresIn) / 1000);
      } else {
        ttl = userId ? 10 * 60 : foundation.settings.session.maxAge + 60;
      }

      let hash = {
        userId,
        createdAt: unixTime()
      };
      const sk = this.tokenKey(token);
      let commands = [
        ['hmset', sk].concat(printTokenHash(hash)),
        ['expireat', sk, '' + ttl]
      ];

      if (userId) commands.push(['sadd', this.userKey(userId), sk]);

      return redisMulti(commands).map(absurd);
    });
  }

  destroy(token) {
    return this.get(token).chain(existingToken => {
      if (!existingToken) return raise(new TokenDoesnotExist(token));

      const sk = this.tokenKey(token);
      let commands = [['del', this.tokenKey(sk)]];
      if (existingToken.userId)
        commands.push(['srem', this.userKey(existingToken.userId), sk]);

      return redisMulti(commands).map(absurd);
    })
  }
}

export function printTokenHash(hash) {
  let ret = [];
  if (hash.userId) ret.push('userId', hash.userId);
  ret.push(
    'createdAt', hash.createdAt
  );

  return ret;
}

export function parseToken(token, hash) {
  let record = {token};

  if (
    typeof hash !== 'object' ||
    hash == null ||
    (!hash.userId && hash.createdAt == null)
  ) return null;

  if (hash.userId) record.userId = hash.userId;
  if (hash.createdAt != null && typeof hash.createdAt !== 'number')
    record.createdAt = parseInt(hash.createdAt, 10);

  return record;
}

function absurd() {}

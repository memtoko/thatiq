import {node, sequencePar_, makeTask_, pure} from '@jonggrang/task';
import {foundation} from '../foundation';
import {fromHuman} from '../utils/time';
import * as crypt from '../utils/crypto';


/**
 * Schema
 *
 * Client = {
 *   name:: String,
 *   tag:: String,
 *   key:: String,
 *   secret:: String,
 *   redirectUri:: String,
 *   canSkipAuthorization:: String,
 *   ownerId:: ObjectId
 * }
 */

/**
 * generate random token
 */
export const generateToken = crypt.randomString(
  32,
  crypt.ASCII_LOWERCASE + crypt.ASCII_UPPERCASE + crypt.DIGITS + '-'
);

/**
 * Save authorization code in redis
 * @returns {Task}
 */
export function saveAuthorizationCode(code, clientId, redirectUri, userId, scope) {
  return makeTask_(cb => {
    const oauthCode = {
      code,
      redirectUri,
      clientId,
      userId,
      scope: Array.isArray(scope) ? scope : scope.split(' ')
    };
    const key = oauthCodeRedisKey(code);
    const expiresAt = Math.round(fromHuman('1h') / 1000.0);
    let commands = [
      ['hmset', key].concat(printOauthCode(oauthCode)),
      ['expireat', key, '' + expiresAt]
    ];

    foundation.redis.multi(commands).exec(cb);
  });
}

/**
 * find authorization code,
 *
 * @param {String} code
 */
export function findAuthorizationCode(code) {
  const redis = foundation.redis;
  return node(redis, oauthCodeRedisKey(code), redis.hgetall)
    .chain(hash => {
      const oauthCode = parseOauthCode(hash);
      // then delete
      return revokeAuthorizationCode(code).map(() => oauthCode);
    });
}

export function revokeAuthorizationCode(code) {
  const redis = foundation.redis;

  return node(redis, oauthCodeRedisKey(code), redis.del)
    .map(result => result > 0);
}

function printOauthCode(oauthCode) {
  return [
    'code', oauthCode.code,
    'clientId', oauthCode.clientId,
    'userId', oauthCode.userId,
    'redirectUri', oauthCode.redirectUri,
    'scope', oauthCode.scope.join(',')
  ]
}

function parseOauthCode(hash) {
  if (!hash.code || !hash.clientId || !hash.userId) return null;

  let ret = Object.assign({}, hash);
  if (typeof ret.scope === 'string') ret.scope = ret.scope.split(',');

  return ret;
}

export function createAuthIndexes(db) {
  const clientColl = db.collection('oauthClients');

  return sequencePar_([
    node(
      clientColl,
      {key: 1},
      clientColl.createIndex
    ),
    node(
      clientColl,
      {ownerId: 1},
      clientColl.createIndex
    )
  ]);
}

function oauthCodeRedisKey(code) {
  return `${foundation.settings.redis.prefix}:oauth:code:${code}`;
}

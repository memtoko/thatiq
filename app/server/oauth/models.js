import {bothPar, node, raise, sequencePar_, makeTask_, pure} from '@jonggrang/task';

import * as tokenProvider from './access-token';
import {foundation} from '../foundation';
import * as libmongodb from '../lib/mongodb';
import {fromHuman} from '../utils/time';
import * as crypt from '../utils/crypto';
import {MongodbCache} from '../utils/cache';


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
 *
 * AccessToken = {
 *  userId:: ObjectId,
 *  clientId:: ObjectId,
 *  token:: String
 * }
 */

export const WEB_INTERNAL_CLIENT_KEY = 'web-internal-key';

const cachedClientLookup = new MongodbCache({collection: 'oauthClients'})

/**
 * generate random token
 */
export const generateToken = crypt.randomString(
  32,
  crypt.ASCII_LOWERCASE + crypt.ASCII_UPPERCASE + crypt.DIGITS
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

/**
 * revoke authorization code
 *
 * @param {String} code
 * @return {Task}
 */
export function revokeAuthorizationCode(code) {
  const redis = foundation.redis;

  return node(redis, oauthCodeRedisKey(code), redis.del)
    .map(result => result > 0);
}

/**
 * find client by it's id
 *
 * @param {String|ObjectId}
 * @return {Task}
 */
export function findClientById(id) {
  return libmongodb.findOne({_id: libmongodb.asObjectId(id)});
}

/**
 *
 * @param {String} token
 * @returns {Task}
 */
export function validateAccessTokenAndClient(token) {
  return tokenProvider.validateToken(token)
    .chain(result => {
      if (!result) {
        foundation.logger.warn({token}, 'Invalid token presented');
        return pure();
      }

      const [userId, clientId] = result;
      if (!clientId) {
        foundation.logger.warn({token}, 'Invalid token presented (no client)');
        return pure();
      }

      return bothPar(
        cachedClientLookup.findById(clientId),
        userId ? libmongodb.findOne('users', {_id: libmongodb.asObjectId(userId)})
          : pure()
      ).map(([client, user]) => {
        if (!client) {
          foundation.logger.warn({token, clientId}, 'Invalid token presented (client not found)');
          return null;
        }

        if (userId && !user) {
          foundation.logger.warn({token, userId}, 'Invalid token presented (user not found)');
          return null;
        }

        return {user, client};
      })
    });
}

export function removeAllAccessTokensForUser(userId) {
  return libmongodb.deleteMany('oauthAccessTokens', {userId: libmongodb.asObjectId(userId)});
}

export function findClientByClientKey(key) {
  return libmongodb.findOne('oauthAccessTokens', {key});
}

export function findOrCreateToken(userId, clientId) {
  if(!clientId) return raise(new Error('clientId required'));

  return tokenProvider.getToken(userId, clientId);
}

export function findOrGenerateWebToken(userId) {
  return findClientByClientKey(WEB_INTERNAL_CLIENT_KEY)
    .chain(client => {
      if (!client) return raise(new Error('web client not ready'));

      const clientId = libmongodb.serializeObjectId(client._id);
      return tokenProvider.getToken(userId, clientId).map(token => [token, client]);
    })
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
  const accessTokenColl = db.collection('oauthAccessTokens');

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
    ),

    node(
      accessTokenColl,
      {userId: 1, clientId: 1},
      accessTokenColl.createIndex
    ),
    node(
      accessTokenColl,
      {token: 1},
      accessTokenColl.createIndex
    )
  ]);
}

function oauthCodeRedisKey(code) {
  return `${foundation.settings.redis.prefix}:oauth:code:${code}`;
}

import {liftEff} from '@jonggrang/task';
import LRU from 'lru-cache';


const MAX_TOKEN_AGE = 2 * 60000; // 2 minutes
const tokenCache = LRU({
  max: 2048,
  maxAge: MAX_TOKEN_AGE
});

const userClientCache = LRU({
  max: 2048,
  maxAge: MAX_TOKEN_AGE
});

function getTokenEff(userId, clientId) {
  if (!userId) return;

  return userClientCache.get(userId + ":" + clientId);
}

function validateTokenEff(token) {
  return tokenCache.get(token);
}

function cacheTokenEff(userId, clientId, token) {
  tokenCache.set(token, [userId, clientId]);
  if (userId) {
    userClientCache.set(userId + ":" + clientId, token);
  }
}

function deleteTokenEff(token) {
  const result = tokenCache.get(token);
  if (!result) return;

  tokenCache.del(token);

  const userId = result[0];
  if (!userId) return;

  const clientId = result[1];
  userClientCache.del(userId + ":" + clientId);
}

function invalidateCacheEff(token) {
  tokenCache.reset();
  userClientCache.reset();
}

export const tokenProvider = {
  getToken(userId, clientId) {
    return liftEff(null, userId, clientId, getTokenEff);
  },

  validateToken(token) {
    return liftEff(null, token, validateTokenEff);
  },

  cacheToken(userId, clientId, token) {
    return liftEff(null, userId, clientId, token, cacheTokenEff);
  },

  deleteToken(token) {
    return liftEff(null, token, deleteTokenEff);
  },

  invalidateCache() {
    return liftEff(null, invalidateCacheEff);
  }
}

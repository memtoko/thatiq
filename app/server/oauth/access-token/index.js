import {forInPar_} from '@jonggrang/task';

import {tokenProvider as memoryTokenProvider} from './memory-token';
import {tokenProvider as redisTokenProvider} from './redis-token';
import {tokenProvider as mongodbTokenProvider} from './mongodb-token';
import {iterate} from './up-down-stream';


const PROVIDERS = [memoryTokenProvider, redisTokenProvider, mongodbTokenProvider];


export function getToken(userId, clientId) {
  return iterate(PROVIDERS,
    provider => provider.getToken(userId, clientId),
    (token, provider) => provider.cacheToken(userId, clientId, token)
  );
}

export function validateToken(token) {
  return iterate(PROVIDERS,
    provider => provider.validateToken(token),
    (result, provider) => {
      const [userId, clientId] = result;
      return provider.cacheToken(userId, clientId, token);
    }
  );
}

export function deleteToken(token) {
  return forInPar_(PROVIDERS, provider => provider.deleteToken(token));
}

export function invalidateCache() {
  return forInPar_(PROVIDERS, provider => provider.invalidateCache());
}

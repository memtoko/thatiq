import {pure} from '@jonggrang/task';

import * as libmongodb from '../../lib/mongodb';
import * as crypt from '../../utils/crypto';


export const tokenProvider = {
  getToken(userId, clientId) {
    if (!userId) return pure();

    userId = libmongodb.asObjectId(userId);
    clientId = libmongodb.asObjectId(clientId);

    return libmongodb.findOne('oauthAccessTokens',
      {userId, clientId},
      {
        projection: {_id: 0, token: 1}
      }
    ).chain(accessToken => {
      if (accessToken && accessToken.token) return pure(accessToken.token);

      return crypt.randomString(
        32,
        crypt.ASCII_LOWERCASE + crypt.ASCII_UPPERCASE + crypt.DIGITS
      ).chain(token =>
        libmongodb.findOneAndUpdate('oauthAccessTokens',
          {userId, clientId},
          {$setOnInsert: {userId, clientId, token}},
          {upsert: true, returnOriginal: false}
        ).map(accessToken => accessToken.token)
      );
    })
  },

  validateToken(token) {
    return libmongodb.findOne('oauthAccessTokens',
      {token},
      {projection: {_id: 0, tuserId: 1, clientId: 1}}
    ).map(accessToken => {
      if (!accessToken) return null;

      const clientId = accessToken.clientId;
      const userId = accessToken.userId;   // userId CAN be null

      if (!clientId) return null; // unknown client

      return [userId, clientId];
    });
  },

  cacheToken(userId, clientId, token) {
    return pure();
  },

  deleteToken(token) {
    return libmongodb.deleteOne('oauthAccessTokens', {token});
  },

  invalidateCache() {
    return pure();
  }
}

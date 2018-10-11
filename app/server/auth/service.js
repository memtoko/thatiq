import {makeDbAction} from '../lib/app-ctx';

/**
 * find user with provider
 */
export function findUserWithProvider(userQuery, providerQuery, opts) {
  return makeDbAction((db, cb) => {
    db.collection('users')
      .aggregate([
        { $match: userQuery },
        {
          $lookup: {
            from: 'authProviders',
            pipeline: [{$match: providerQuery}],
            localField: '_id',
            foreignField: 'user',
            as: 'providers'
          }
        },
      ], opts, cb);
  });
}

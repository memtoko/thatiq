import {makeTask_} from '@jonggrang/task';

import {foundation} from '../foundation';

/**
 * find user with provider
 */
export function findUserWithProvider(userQuery, providerQuery, opts) {
  return makeTask_(cb => {
    foundation.db.collection('users')
      .aggregate([
        { $match: userQuery },
        {
          $lookup: {
            from: 'authProviders',
            let: {user_id: '$_id'},
            pipeline: [
              {$match: providerQuery},
              {$project: {user: 0}},
            ],
            as: 'providers'
          }
        },
      ], opts, cb);
  });
}

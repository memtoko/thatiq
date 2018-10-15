import * as assert from 'assert';
import {ObjectID} from 'mongodb';

import { randomString } from '@jonggrang/cryptic';
import { isLeft } from '@jonggrang/prelude';
import * as T from '@jonggrang/task';

import {foundation} from '../../../app/server/foundation';
import * as authCheck from '../../../app/server/auth/check';


describe('auth check', function () {
  it('can issue jwt token', async function () {
    const secret = await T.toPromise(randomString(50));
    const settings = { app: { jwtKey: secret }};
    const oldSettings = foundation.settings;
    foundation.settings = settings;

    const user = {
      _id: ObjectID(),
      email: 'test@gmail.com',
      profile: {
        name: 'test'
      }
    };
    const token = await T.toPromise(authCheck.issueJWTWebToken(user, '1h'));
    const decoded = await T.toPromise(authCheck.verifyJWTWebToken(token));

    foundation.settings = oldSettings;
    assert.equal(decoded.id, user._id.toHexString());
  });

  it('unsigned jwt token should considered invalid', async function () {
    const secret = await T.toPromise(randomString(50));
    const settings = { app: { jwtKey: secret }};
    const oldSettings = foundation.settings;
    foundation.settings = settings;
    const user = {
      _id: ObjectID(),
      email: 'test@gmail.com',
      profile: {
        name: 'test'
      }
    };

    // A common method for attacking a signed JWT is to simply remove the signature
    const token = await T.toPromise(authCheck.issueJWTWebToken(user, '1h'));
    const modified = token.split('.', 2).join('.');

    const decoded = await T.toPromise(T.attempt(
      authCheck.verifyJWTWebToken(modified)));

    foundation.settings = oldSettings;
    assert.ok(isLeft(decoded));
  });
});

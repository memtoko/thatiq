import * as assert from 'assert';

import * as T from '@jonggrang/task';
import {randomString} from '@jonggrang/cryptic';

import {PBKDF2PasswordHasher} from '../../../app/server/auth/hasher'
import {encodePassword, checkPassword} from '../../../app/server/auth/model';


describe('auth hasher', function () {
  describe('pbdkf2', function () {
    it('encode and verify', async function () {
      const pbdkf2 = new PBKDF2PasswordHasher();

      const pswd = await T.toPromise(randomString(32));
      const salt = await T.toPromise(pbdkf2.salt());
      const encoded = await T.toPromise(pbdkf2.encode(pswd, salt));

      const verified = await T.toPromise(pbdkf2.verify(pswd, encoded));

      assert.ok(verified);
    });
  });

  describe('encode and check password', function () {
    it('encode and check success if password match', async function () {
      const pbdkf2 = new PBKDF2PasswordHasher();
      const app = { hasher: pbdkf2 };

      const pswd = await T.toPromise(randomString(32));
      const encoded = await T.toPromise(encodePassword(pswd).run(app));
      const isValid = await T.toPromise(checkPassword(pswd, encoded).run(app));

      assert.ok(isValid);
    });

    it('encode and check failed if password not match', async function () {
      const pbdkf2 = new PBKDF2PasswordHasher();
      const app = { hasher: pbdkf2 };

      const master = await T.toPromise(randomString(64));
      const pswd = master.slice(0, 32);
      const pswd2 = master.slice(32, 64);

      const encoded = await T.toPromise(encodePassword(pswd).run(app));
      const isValid = await T.toPromise(checkPassword(pswd2, encoded).run(app));

      assert.ok(!isValid);
    });
  });
});

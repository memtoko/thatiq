import * as assert from 'assert';
import {toPromise} from '@jonggrang/task';

import {PBKDF2PasswordHasher} from '../../../app/server/auth/hasher'
import {createUserDocument} from '../../../app/server/auth/models';
import {mongoConnect, mongoClose} from '../../../app/server/lib/mongodb';


describe('User model', () => {
  describe('create user document', () => {
    let app = {};

    before(async () => {
      app.client = await toPromise(mongoConnect(process.env.MONGODB_URI));
      app.hasher = new PBKDF2PasswordHasher();
    });

    after(async () => {
      await toPromise(mongoClose(app.client));
    });
    it('create user basic document', async () => {
      const user = await toPromise(createUserDocument('foo@gmail.com', 'abc', {
        name: 'foo bar'
      }).run(app));

      assert.notEqual(user.password, 'abc');
      assert.equal(user.email, 'foo@gmail.com');
      assert.ok(!user.isSuperuser);
      assert.ok(!user.isStaff);
      assert.deepEqual(user.profile, {name: 'foo bar'});
    });
  });
});

import * as assert from 'assert';

import * as T from '@jonggrang/task';
import * as crypt from '../../../app/server/utils/crypto';

describe('utils.crypto', function () {
  it('randomInts return an array with the given len', async function () {
    const xs = await T.toPromise(crypt.randomInts(32));
    assert.equal(xs.length, 32);
    assert.ok(xs.every(x => x >= -2147483648 && x <= 2147483647));
  });

  it('randomString can generate random string with given charset', async function () {
    const pswd = await T.toPromise(crypt.randomString(50));
    assert.equal(pswd.length, 50);
  })
});

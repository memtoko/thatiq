import {sequencePar_} from '@jonggrang/task';

import {createAuthIndexes as authIndexes} from '../auth/models';
import {createAuthIndexes as oauthIndexes} from '../oauth/models';
import {foundation} from '../foundation';


export function initDbIndex() {
  const db = foundation.db;

  return sequencePar_([
    authIndexes(db),
    oauthIndexes(db),
  ]);
}

import {pure, rescueOnJust} from '@jonggrang/task';
import {just, nothing} from '@jonggrang/prelude';

import {foundation} from '../../foundation';
import * as crypt from '../../utils/crypto';


export function issueToken(userId, expiresIn) {
  return rescueOnJust(
    isErrorTokentExist,
    issueTokenNaive(userId, expiresIn),
    () => issueToken(userId, expiresIn)
  );
}

export function isTokenRevoked(token) {
  const tokenProvider = foundation.tokenProvider;

  return tokenProvider.get(token).map(x => x ? false : true);
}

export function revokeToken(token) {
  const tokenProvider = foundation.tokenProvider;

  return rescueOnJust(
    isErrorTokenDoesnotExist,
    tokenProvider.destroy(token),
    () => pure(void 0)
  );
}

function isErrorTokenDoesnotExist(error) {
  return error.code === 'ETOKENNOTEXIST' ? just(error)
    : nothing;
}

function isErrorTokentExist(error) {
  return error.code === 'ETOKENEXIST' ? just(error)
    : nothing;
}

function issueTokenNaive(userId, expiresIn) {
  const tokenProvider = foundation.tokenProvider;

  crypt.randomString(50, crypt.ASCII_LOWERCASE + crypt.ASCII_UPPERCASE + crypt.DIGITS + '-')
    .chain(token =>
      tokenProvider.insert(
        userId,
        token,
        {expiresIn}
      ).map(() => token)
    );
}

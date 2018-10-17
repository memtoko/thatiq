import {pure, rescueOnJust} from '@jonggrang/task';
import {just, nothing} from '@jonggrang/prelude';

import {issueJWTWebToken, verifyJWTWebToken} from '../check';
import {foundation} from '../../foundation';


export class TokenAlreadyExist extends Error {
  constructor(oldToken, newToken) {
    super('There is already exists a session with the same token');
    this.oldToken = oldToken;
    this.newToken = newToken;
    this.code = 'ETOKENEXIST'
  }
}

export class TokenDoesnotExist extends Error {
  constructor(token) {
    super('There is no session with the given token');
    this.token = token;
    this.code = 'ETOKENNOTEXIST';
  }
}

export function issueToken(user, expiresIn) {
  const tokenProvider = foundation.tokenProvider;

  return issueJWTWebToken(user, expiresIn)
    .chain(jwtToken =>
      tokenProvider.get(jwtToken)
        .chain(existingToken =>
          existingToken ? pure(jwtToken)
            : tokenProvider.insert(
                user !== '' ? user._id.toHexString() : '',
                jwtToken
              ).map(() => jwtToken)
        )
    );
}

export function validateToken(token) {
  const tokenProvider = foundation.tokenProvider;

  return tokenProvider.get(token)
    .chain(existingToken => {
      if (!existingToken) return pure(false);

      return verifyJWTWebToken(token);
    });
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
  return error.code === 'ETOKENNOTEXIST' ? just(error.token)
    : nothing;
}

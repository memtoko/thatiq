import {foundation} from '../foundation';
import {signPayload, verifyPayload} from '../utils/crypto';
import {issueToken} from './tokens';

/**
 * issue JWT token
 *
 * @param {User|String} user
 * @param {String} expiresIn
 * @returns {ReaderT}
 */
export function issueJWTWebToken(user, expiresIn) {
  const settings = foundation.settings;
  const userId = user !== '' ? user._id.toHexString() : '';

  return issueToken(userId, expiresIn || '24h').chain(token =>
    signPayload(
      {token, id: userId},
      settings.jwtKey,
      {expiresIn: expiresIn || '24h'}
    )
  );
}

/**
 * verify json web token
 *
 * @param {String} token
 * @return {ReaderT}
 */
export function verifyJWTWebToken(token) {
  const settings = foundation.settings;
  return verifyPayload(token, settings.jwtKey);
}

export function userCanAuthenticate(user) {
  return user.isActive || user.isActive == null;
}

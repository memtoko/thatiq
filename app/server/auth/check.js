import {AppCtx} from '../lib/app-ctx';
import {signPayload, verifyPayload} from '../utils/crypto';


/**
 * issue JWT token
 *
 * @param {User} user
 * @param {String} expiresIn
 * @returns {ReaderT}
 */
export function issueJWTWebToken(user, expiresIn) {
  return new AppCtx(app => {
    const settings = app.settings;
    return signPayload(
      {id: user._id.toHexString()},
      settings.app.jwtKey,
      { expiresIn: expiresIn || '24h' }
    );
  });
}

/**
 * verify json web token
 *
 * @param {String} token
 * @return {ReaderT}
 */
export function verifyJWTWebToken(token) {
  return new AppCtx(app => {
    const settings = app.settings;
    return verifyPayload(token, settings.app.jwtKey);
  });
}

import * as url from 'url';

import {AppCtx} from '../lib/app-ctx';
import {signPayload, verifyPayload} from '../utils/crypto';


const AUTH_PROVIDERS = {
  google: true,
  twitter: true,
  facebook: true,
};

export function ensureLogin(req, res, next) {
  if (req.user) return next();

  requireLogin(req, res, next);
}

export function requireLogin(req, res, next) {
  if (req.session) {
    res.session.returnTo = req.originalUrl;
  }

  const provider = getAuthProviderIfValid(req);
  if (provider) {
    let query = {};

    if (req.query.action) query.action = req.query.action;
    if (req.query.source) query.source = req.query.source;

    req.log.debug({provider}, 'user is not logged in redirecting to provider');

    let relPath = req.format({
      query,
      pathname: `/auth/login/${provider}`
    });

    res.redirect(relPath);
  }

  res.redirect('/auth/login');
}

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

export function userCanAuthenticate(user) {
  return user.isActive || user.isActive == null;
}

function getAuthProviderIfValid(req) {
  const authProvider = req.query.auth_provider;

  if (!AUTH_PROVIDERS[authProvider]) {
    req.log.debug({provider: authProvider}, 'invalid auth provider');
  }

  return authProvider;
}

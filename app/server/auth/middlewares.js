import * as url from 'url';


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

    let relPath = url.format({
      query,
      pathname: `/auth/login/${provider}`
    });

    res.redirect(relPath);
    return;
  }

  res.redirect('/auth/login');
}

function getAuthProviderIfValid(req) {
  const authProvider = req.query.auth_provider;

  if (!AUTH_PROVIDERS[authProvider]) {
    req.log.debug({provider: authProvider}, 'invalid auth provider');
  }

  return authProvider;
}

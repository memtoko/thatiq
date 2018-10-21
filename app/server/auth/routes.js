import passport from 'passport';

import {foundation} from '../foundation';
import {ensureLogin} from './middlewares';

/**
 * Define route for auth functionality
 *
 * @param {Foundation} foundation
 * @return {void}
 */
export function defineRoutes(router) {

  router.get('/facebook',
    {name: 'facebook'},
    passport.authenticate('facebook', {
      failWithError: false,
      scope: ['email', 'public_profile']
    })
  );
  router.get('/facebook/callback',
    {name: 'facebook.callback'},
    passport.authenticate('facebook', {failWithError: false}),
    ensureLogin,
    redirectAfterLogin
  );

  router.get('/google',
    {name: 'google'},
    passport.authenticate('google', {
      failWithError: false,
      scope: [
        'https://www.googleapis.com/auth/plus.login',
        'https://www.googleapis.com/auth/plus.profile.emails.read'
      ]
    })
  );
  router.get('/google/callback',
    {name: 'google.callback'},
    passport.authenticate('google', {failWithError: false}),
    ensureLogin,
    redirectAfterLogin
  );

  router.get('/twitter',
    {name: 'twitter'},
    passport.authenticate('twitter', {failWithError: true})
  );
  router.get('/twitter/callback',
    {name: 'twitter.callback'},
    passport.authenticate('twitter', {failWithError: true}),
    ensureLogin,
    redirectAfterLogin
  );
}

export function redirectAfterLogin(req, res) {
  if (req.session && req.session.returnTo) {
    res.redirect(req.session.returnTo);
    return;
  }

  const user = req.user;

  res.redirect(user.isStaff ? foundation.settings.app.adminPath : '/');
}

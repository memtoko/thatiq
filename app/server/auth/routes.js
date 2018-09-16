import passport from 'passport';
import {runTask} from '@jonggrang/task';

import {issueJWTWebToken} from './check';
import {Router} from '../lib/router';

/**
 * Define route for auth functionality
 *
 * @param {Foundation} foundation
 * @return {void}
 */
export function defineRoutes(foundation) {
  const app = Router();
  const handlers = defineHandler(foundation);

  app.get('/facebook',
    {name: 'auth.facebook'},
    passport.authenticate('facebook', {scope: ['email', 'public_profile']}));
  app.get('/facebook/callback',
    {name: 'auth.facebook.callback'},
    passport.authenticate('facebook', {session: false}),
    handlers.socialAuthComplete
  );

  app.get('/google',
    {name: 'auth.google'},
    passport.authenticate('google', {
      scope: [
        'https://www.googleapis.com/auth/plus.login',
        'https://www.googleapis.com/auth/plus.profile.emails.read'
      ]
    })
  );
  app.get('/google/callback',
    {name: 'auth.google.callback'},
    passport.authenticate('google', {session: false}),
    handlers.socialAuthComplete
  );

  app.get('/twitter', {name: 'auth.twitter'}, passport.authenticate('twitter'));
  app.get('/twitter/callback',
    {name: 'auth.twitter.callback'},
    passport.authenticate('twitter', {session: false}),
    handlers.socialAuthComplete
  );

  return app;
}

export function defineHandler(foundation) {
  function socialAuthComplete(req, res, next) {
    if (!req.user) return next();

    runTask(issueJWTWebToken(req.user, '24h').run(foundation), (err, token) => {
      if (err) return next(err);

      res.render('auth/social-complete.html', {token}, (err, html) => {
        if (err) return next(err);

        res.status(200).send(html);
      });
    });
  }

  return {
    socialAuthComplete
  }
}

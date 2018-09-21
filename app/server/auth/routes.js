import passport from 'passport';
import {runTask} from '@jonggrang/task';

import {issueJWTWebToken} from './check';


/**
 * Define route for auth functionality
 *
 * @param {Foundation} foundation
 * @return {void}
 */
export function defineRoutes(router, foundation) {
  const handlers = defineHandler(foundation);

  router.get('/facebook',
    {name: 'facebook'},
    passport.authenticate('facebook', {scope: ['email', 'public_profile']}));
  router.get('/facebook/callback',
    {name: 'facebook.callback'},
    passport.authenticate('facebook', {session: false}),
    handlers.socialAuthComplete
  );

  router.get('/google',
    {name: 'google'},
    passport.authenticate('google', {
      scope: [
        'https://www.googleapis.com/auth/plus.login',
        'https://www.googleapis.com/auth/plus.profile.emails.read'
      ]
    })
  );
  router.get('/google/callback',
    {name: 'google.callback'},
    passport.authenticate('google', {session: false}),
    handlers.socialAuthComplete
  );

  router.get('/twitter', {name: 'twitter'}, passport.authenticate('twitter'));
  router.get('/twitter/callback',
    {name: 'twitter.callback'},
    passport.authenticate('twitter', {session: false}),
    handlers.socialAuthComplete
  );
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
  };
}

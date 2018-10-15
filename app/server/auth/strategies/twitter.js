import {runTask} from '@jonggrang/task';

import {foundation} from '../../foundation';
import {randomString} from '../../utils/crypto';
import {encodePassword, newUser} from '../models';


export function twitterCallback(req, token, tokenSecret, profile, done) {
  const userColl = foundation.db.collection('users');
  const providerColl = foundation.db.collection('authProviders');

  providerColl.findOne({name: 'twitter', key: profile.id}, (err, existingProvider) => {
    if (err) return done(err);
    // the user is logged in but we found the the auth provider, so bail out
    if (req.user && existingProvider) {
      req.flash('errors', {
        msg: ('There is already a Twiter account that belongs to you.' +
          'Sign in with that account or delete it, then link it with your current account.')
      });
      return done(null, false);
    }

    // the user logged in but we don't find auth provider, so link this user with
    // this authProvider
    if (req.user && !existingProvider) {
      return providerColl.findOneAndUpdate(
        {name: 'twitter', key: profile.id},
        {$set: {name: 'twitter', key: profile.id, user: req.user._id}},
        {upsert: true, returnOriginal: false},
        (err) => {
          if (err) return done(err);

          done(null, req.user);
      });
    }

    // found provider and user still not logged in, let it login
    if (!req.user && existingProvider) {
      return userColl.findOne({_id: existingProvider.user}, (err, existingUser) => {
        if (err) return done(err);
        if (!existingUser) {
          req.log.warn({
            message: 'found provider auth but can\'t find the associate user',
            providerName: 'twitter',
            providerId: existingProvider._id.toHexString()
          });
          return done(null, false);
        }

        return done(null, existingUser);
      });
    }

    // both req.user and provider not found, so create new user
    const email = Array.isArray(profile.emails) && profile.emails.length > 0
      ? profile.emails[0].value.toLowerCase()
      : '';

    // Twitter api require permission to read email. So, make sure we sent request
    // to Twitter
    if (email === '') return done(new Error('cant get email from Twitter API'));

    userColl.findOne({email}, (err, existingEmailUser) => {
      if (err) return done(err);

      if (existingEmailUser) {
        req.flash('errors', {
          msg: ('There is already an account using this email address.' +
            'Sign in to that account and link it with Twitter manually from Account Settings.')
          }
        );
        return done(null, false);
      }

      const tasks = randomString(32)
        .chain(encodePassword)
        .chain(password => {
          return newUser({
            email,
            password,
            profile: {
              name: profile.displayName,
              picture: Array.isArray(profile.photos) && profile.photos.length > 0
                ? profile.photos[0].value
                : '',
            }
          }, {
            name: 'twitter',
            key: profile.id
          })
        });

      runTask(tasks, done);
    })
  });
}

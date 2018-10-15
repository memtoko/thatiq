import {runTask} from '@jonggrang/task';

import {foundation} from '../../foundation';
import {randomString} from '../../utils/crypto';
import {encodePassword, newUser} from '../models';


export function googleCallback(req, accessToken, requestToken, profile, done) {
  const userColl = foundation.db.collection('users');
  const providerColl = foundation.db.collection('authProviders');

  providerColl.findOne({name: 'google', key: profile.id}, (err, existingProvider) => {
    if (err) return done(err);

    if (req.user && existingProvider) {
      req.flash('errors', {
        msg: ('There is already a Google account that belongs to you.' +
          'Sign in with that account or delete it, then link it with your current account.')
      });
      return done(null, false);
    }

    if (req.user && !existingProvider) {
      return providerColl.findOneAndUpdate(
        {name: 'google', key: profile.id},
        {$set: {name: 'google', key: profile.id, user: req.user._id}},
        {upsert: true, returnOriginal: false},
        (err) => {
          if (err) return done(err);

          done(null, req.user);
      });
    }

    if (!req.user && existingProvider) {
      return userColl.findOne({_id: existingProvider.user}, (err, existingUser) => {
        if (err) return done(err);

        if (!existingUser) {
          req.log.warn({
            message: 'found provider auth but can\'t find the associate user',
            providerName: 'google',
            providerId: existingProvider._id.toHexString()
          });
          return done(null, false);
        }

        done(null, existingUser);
      });
    }

    const email = profile.email || (
      Array.isArray(profile.emails) && profile.emails.length > 0
        ? profile.emails[0].value
        : '');

    if (email === '') return done(new Error('cant get email from Google API'));

    userColl.findOne({email}, (err, existingEmailUser) => {
      if (err) return done(err);

      if (existingEmailUser) {
        req.flash('errors', {
          msg: ('There is already an account using this email address.' +
            'Sign in to that account and link it with Google manually from Account Settings.')
          }
        );
        return done(null, false);
      }

      const task = randomString(32)
        .chain(encodePassword)
        .chain(password =>
          newUser({
            email,
            password,
            profile: {
              name: user.profile.name || profile.displayName,
              picture: user.profile.picture || (
                Array.isArray(profile.photos) && profile.photos.length > 0
                  ? profile.photos[0].value
                  : '')
            }
          }, {name: 'facebook', key: profile.id})
        );

      runTask(task, done);
    })
  });
}

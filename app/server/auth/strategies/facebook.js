import {runTask} from '@jonggrang/task';

import {foundation} from '../../foundation';
import {randomString} from '../../utils/crypto';
import {encodePassword, newUser} from '../models';


export function facebookCallback(req, accessToken, refreshToken, profile, done) {
  const userColl = foundation.db.collection('users');
  const providerColl = foundation.db.collection('authProviders');

  providerColl.findOne({name: 'facebook', key: profile.id}, (err, existingProvider) => {
    if (err) return done(err);

    if (req.user && existingProvider) {
      req.flash('errors', {
        msg: ('There is already a Facebook account that belongs to you.' +
          'Sign in with that account or delete it, then link it with your current account.')
      });
      return done(null, false);
    }

    if (req.user && !existingProvider) {
      return providerColl.findOneAndUpdate(
        {name: 'facebook', key: profile.id},
        {$set: {name: 'facebook', key: profile.id, user: req.user._id}},
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
            message: 'found provider auth but can\'t foind the associate user',
            providerName: 'facebook',
            providerId: existingProvider._id.toHexString()
          });
          return done(null, false);
        }

        done(null, existingUser);
      });
    }

    userColl.findOne({email: profile._json.email}, (err, existingEmailUser) => {
      if (err) return done(err);
      if (existingEmailUser) {
        req.flash('errors', {
          msg: ('There is already an accunt using this emaill address.' +
            'Sign in to that account and link it with Facebook manually from Account settings')
        });
        return done(null, false);
      }

      const task = randomString(32)
        .chain(encodePassword)
        .chain(password =>
          newUser({
            email: profile._json.email,
            password: password,
            profile: {
              name: `${profile.name.givenName} ${profile.name.familyName}`,
              picture: `https://graph.facebook.com/${profile.id}/picture?type=large`,
            }
          }, {name: 'facebook', key: profile.id})
        );

      runTask(task, done);
    });
  });
}

import passport from 'passport';
import {Strategy as FbStrategy} from 'passport-facebook';
import {Strategy as GoogleStrategy} from 'passport-google-oauth2';
import {Strategy as JWTStrategy, ExtractJwt} from 'passport-jwt';
import {Strategy as LocalStrategy} from 'passport-local';
import {Strategy as TwitterStrategy} from 'passport-twitter';
import {runTask} from '@jonggrang/task';

import {findOne, insertOne} from '../lib/mongodb';
import {encodePassword, checkPassword, setPassword, createUserDocument} from './model';
import * as ucrypt from '../utils/crypto';


/**
 * configure passport for authentication
 *
 * @param {Foundation}
 */
export function configurePassport(foundation) {
  const {services: serviceSettings} = foundation.settings;
  const userColl = foundation.db.collection('users');

  passport.serializeUser = function serializeUser(user, done) {
    done(undefined, user._id);
  }

  passport.deserializeUser = function deserializeUser(id, done) {
    userColl.findOne({_id: id}, done);
  }

  // local strategy
  passport.use(new LocalStrategy({usernameField: 'email'}, (email, pswd, done) => {
    const action = findOne('users', {email: email.toLowerCase()})
      .chain(user => {
        if (!user) {
          // user doesn't exist, run hasher to avoid timing difference
          return encodePassword(pswd).map(() => [undefined, false]);
        }
        function setter(pswd) {
          return setPassword(user._id, pswd);
        }
        return checkPassword(pswd, user.password, setter).map(isMatch => [user, isMatch]);
      });

    runTask(action.run(foundation), (err, [user, isMatch]) => {
      if (err) return done(err);
      // user didn't exists
      if (user == null) return done(undefined, false, {message: 'Invalid email or password'})

      if (isMatch) return done(undefined, user);

      done(undefined, false, {message: 'Invalid email or password'});
    });
  }));

  // facebook
  passport.use(new FbStrategy({
    clientID: serviceSettings.facebook.key,
    clientSecret: serviceSettings.facebook.secret,
    callbackURL: '/auth/facebook/callback',
    profileFields: ['name', 'email', 'link', 'locale', 'timezone'],
    passReqToCallback: true
  }, (req, accessToken, refreshToken, profile, done) => {
    if (req.user) {
      // this user already login
      userColl.finOne({facebook: profile.id}, (err, existingUser) => {
        if (err) return done(err);
        if (existingUser) {
          req.flash('errors', {
            msg: ('There is already a Facebook account that belongs to you.' +
              'Sign in with that account or delete it, then link it with your current account.')
          });
          return done(err);
        }

        userColl.findOne({_id: req.user._id}, (err, user) => {
          if (err) return done(err);

          userColl.updateOne({_id: user._id}, {
            $set: {
              facebook: profile.id,
              'profile.name': user.profile.name || `${profile.name.givenName} ${profile.name.familyName}`,
              'profile.picture': user.profile.picture || `https://graph.facebook.com/${profile.id}/picture?type=large`
            }
          }, (err) => {
            if (err) return done(err);

            done(undefined, Object.assign({}, user, {
              facebook: profile.id,
              profile: Object.assign({}, user.profile, {
                name: user.profile.name || `${profile.name.givenName} ${profile.name.familyName}`,
                picture: user.profile.picture || `https://graph.facebook.com/${profile.id}/picture?type=large`
              })
            }));
          })
        });
      });
    } else {
      userColl.findOne({facebook: profile.id}, (err, existingUser) => {
        if (err) return done(err);
        if (existingUser) return done(undefined, existingUser);

        userColl.findOne({email: profile._json.email}, (err, existingEmailUser) => {
          if (err) return done(err);

          if (existingEmailUser) {
            req.flash('errors', {
              msg: ('There is already an account using this email address.' +
                'Sign in to that account and link it with Facebook manually from Account Settings.')
              }
            );
            return done(err);
          }

          const pswd = ucrypt.getRandomString(
            32,
            ucrypt.ASCII_LOWERCASE + ucrypt.ASCII_UPPERCASE + ucrypt.DIGITS + ucrypt.PUNCTUATIONS
          );

          const action = createUserDocument(profile._json.email, pswd, {
            name: `${profile.name.givenName} ${profile.name.familyName}`,
            picture: `https://graph.facebook.com/${profile.id}/picture?type=large`,
            location: (profile._json.location) ? profile._json.location.name : ''
          }, {facebook: profile.id}).chain(userDocs =>
            insertOne('users', userDocs)
              .map(({insertedId}) => Object.assign({}, userDocs, {
                _id: insertedId
              }))
          );

          runTask(action.run(foundation), done);
        });
      });
    }
  }));

  // google
  passport.use(new GoogleStrategy({
    clientID: serviceSettings.google.key,
    clientSecret: serviceSettings.google.secret,
    callbackURL: '/auth/google/callback',
    passReqToCallback: true
  }, (req, accessToken, refreshToken, profile, done) => {
    if (req.user) {
      userColl.findOne({google: profile.id}, (err, existingUser) => {
        if (err) return done(err);
        if (existingUser) {
          req.flash('errors', {
            msg: ('There is already a Google account that belongs to you.' +
              'Sign in with that account or delete it, then link it with your current account.')
          });
          return done(err);
        }

        userColl.findOne({_id: req.user._id}, (err, user) => {
          if (err) return done(err);

          userColl.updateOne({_id: user._id}, {
            $set: {
              google: profile.id,
              'profile.name': user.profile.name || profile.displayName,
              'profile.location': user.profile.location || profile.placesLived,
              'profile.picture': user.profile.picture || (
                Array.isArray(profile.photos) && profile.photos.length > 0
                  ? profile.photos[0].value
                  : '')
            }
          }, (err) => {
            if (err) return done(err);

            done(undefined, Object.assign({}, user, {
              google: profile.id,
              profile: Object.assign({}, user.profile, {
                name: user.profile.name || profile.displayName,
                location: user.profile.location || profile.placesLived,
                picture: user.profile.picture || (
                  Array.isArray(profile.photos) && profile.photos.length > 0
                    ? profile.photos[0].value
                    : '')
              })
            }))
          });
        });
      });
    } else {
      userColl.findOne({google: profile.id}, (err, existingUser) => {
        if (err) return done(err);
        if (existingUser) return done(undefined, existingUser);

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
            return done(err);
          }

          const pswd = ucrypt.getRandomString(
            32,
            ucrypt.ASCII_LOWERCASE + ucrypt.ASCII_UPPERCASE + ucrypt.DIGITS + ucrypt.PUNCTUATIONS
          );
          const action = createUserDocument(email, pswd, {
            name: profile.displayName,
            picture: Array.isArray(profile.photos) && profile.photos.length > 0
              ? profile.photos[0].value
              : '',
            location: profile.placesLived
          }, {twitter: profile.id}).chain(userDocs =>
            insertOne('users', userDocs)
              .map(({insertedId}) => Object.assign({}, userDocs, {
                _id: insertedId
              }))
          );

          runTask(action.run(foundation), done);
        });
      });
    }
  }));

  // twitter
  passport.use(new TwitterStrategy({
    consumerKey: serviceSettings.twitter.key,
    consumerSecret: serviceSettings.twitter.secret,
    callbackURL: '/auth/twitter/callback'
  }, (req, token, tokenSecret, profile, done) => {
    if (req.user) {
      userColl.findOne({twitter: profile.id}, (err, existingUser) => {
        if (err) return done(err);
        if (existingUser) {
          req.flash('errors', {
            msg: ('There is already a Twitter account that belongs to you.' +
              'Sign in with that account or delete it, then link it with your current account.')
          });
          return done(err);
        }

        userColl.findOne({_id: req.user._id}, (err, user) => {
          if (err) return done(err);

          userColl.updateOne({_id: user._id}, {
            $set: {
              twitter: profile.id,
              'profile.name': user.profile.name || profile.displayName,
              'profile.picture': user.profile.picture || (
                Array.isArray(profile.photos) && profile.photos.length > 0
                  ? profile.photos[0].value
                  : '')
            }
          }, (err) => {
            if (err) return done(err);

            done(undefined, Object.assign({}, user, {
              twitter: profile.id,
              profile: Object.assign({}, user.profile, {
                name: user.profile.name || profile.displayName,
                picture: user.profile.picture || (
                  Array.isArray(profile.photos) && profile.photos.length > 0
                    ? profile.photos[0].value
                    : '')
              })
            }));
          });
        });
      });
    } else {
      userColl.findOne({twitter: profile.id}, (err, existingUser) => {
        if (err) return done(err);
        if (existingUser) return done(undefined, existingUser);

        const email = Array.isArray(profile.emails) && profile.emails.length > 0
          ? profile.emails[0].value
          : '';

        if (email === '') return done(new Error('cant get email from Twitter API'));
        userColl.findOne({email}, (err, existingEmailUser) => {
          if (err) return done(err);

          if (existingEmailUser) {
            req.flash('errors', {
              msg: ('There is already an account using this email address.' +
                'Sign in to that account and link it with Twitter manually from Account Settings.')
              }
            );
            return done(err);
          }

          const pswd = ucrypt.getRandomString(
            32,
            ucrypt.ASCII_LOWERCASE + ucrypt.ASCII_UPPERCASE + ucrypt.DIGITS + ucrypt.PUNCTUATIONS
          );
          const action = createUserDocument(email, pswd, {
            name: profile.displayName,
            picture: Array.isArray(profile.photos) && profile.photos.length > 0
              ? profile.photos[0].value
              : '',
          }, {twitter: profile.id}).chain(userDocs =>
            insertOne('users', userDocs)
              .map(({insertedId}) => Object.assign({}, userDocs, {
                _id: insertedId
              }))
          );

          runTask(action.run(foundation), done);
        });
      });
    }
  }));

  // jwt token
  passport.use(new JWTStrategy({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken,
    secretOrKey: foundation.settings.app.jwtKey
  }, (payload, done) => {
    userColl.findOne({email: payload.email}, (err, user) => {
      if (err) return done(err);
      if (user) done(undefined, user);
      else done(undefined, false);
    })
  }));
}

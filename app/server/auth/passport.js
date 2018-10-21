import {ObjectID} from 'mongodb';
import passport from 'passport';
import {Strategy as FbStrategy} from 'passport-facebook';
import {Strategy as GoogleStrategy} from 'passport-google-oauth2';
import {Strategy as JWTStrategy, ExtractJwt} from 'passport-jwt';
import {Strategy as LocalStrategy} from 'passport-local';
import {Strategy as TwitterStrategy} from 'passport-twitter';

import {foundation} from '../foundation';
import * as strategies from './strategies';


/**
 * configure passport for authentication
 *
 */
export function configurePassport() {
  const {services: serviceSettings} = foundation.settings;
  const userColl = foundation.db.collection('users');

  passport.serializeUser = function serializeUser(user, done) {
    done(null, user._id.toHexString());
  }

  passport.deserializeUser = function deserializeUser(id, done) {
    if (ObjectID.isValid(id)) userColl.findOne({_id: ObjectID(id)}, done);
    else done(null, false);
  }

  // local strategy
  passport.use(new LocalStrategy({usernameField: 'email'}, strategies.localCallback));

  // facebook
  passport.use(new FbStrategy({
    clientID: serviceSettings.facebook.key,
    clientSecret: serviceSettings.facebook.secret,
    callbackURL: '/auth/facebook/callback',
    profileFields: ['name', 'email', 'link', 'locale', 'timezone'],
    passReqToCallback: true
  }, strategies.facebookCallback));

  // google
  passport.use(new GoogleStrategy({
    clientID: serviceSettings.google.key,
    clientSecret: serviceSettings.google.secret,
    callbackURL: '/auth/google/callback',
    passReqToCallback: true
  }, strategies.googleCallback));

  // twitter
  passport.use(new TwitterStrategy({
    consumerKey: serviceSettings.twitter.key,
    consumerSecret: serviceSettings.twitter.secret,
    callbackURL: '/auth/twitter/callback',
    passReqToCallback: true
  }, strategies.twitterCallback));

  // jwt token
  passport.use(new JWTStrategy({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: foundation.settings.jwtKey
  }, (payload, done) => {
    if (typeof payload.id === 'string' && ObjectID.isValid(payload.id)) {
      userColl.findOne({_id: ObjectID(payload.id)}, (err, user) => {
        if (err) return done(err);
        if (user) done(null, user);
        else done(null, false);
      });
    } else {
      process.nextTick(() => done(null, false));
    }
  }));
}

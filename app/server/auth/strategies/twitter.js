import {ObjectId} from 'mongodb';


export function twitterOauthCallback(app) {
  const userColl = app.db.collection('users');
  const providerColl = app.db.collection('authProviders');

  return function twitterOauthHandler(req, token, tokenSecret, profile, done) {
    if (req.user) {
      providerColl.findOne({name: 'twitter', key: profile.id}, (err, existingProvider) => {
        if (err) return done(err);
        if (existingProvider) {
          req.flash('errors', {
            msg: ('There is already a Twitter account that belongs to you.' +
              'Sign in with that account or delete it, then link it with your current account.')
          })
        }
      });
    }
  };
}

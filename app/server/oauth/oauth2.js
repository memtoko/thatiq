import {runTask, pure} from '@jonggrang/task';
import oauth2orize from 'oauth2orize';
import {ObjectId} from 'mongodb';
import passport from 'passport';

import {ensureLogin} from '../auth/middlewares';
import {foundation} from '../foundation';
import {ObjectDoesnotExist} from '../lib/errors';
import * as libmongodb from '../lib/mongodb';
import * as oauth2Model from './models';


const server = oauth2orize.createServer();


/**
 * serializer
 */
server.serializeClient((client, cb) => {
  cb(null, client._id.toHexString());
});

server.deserializeClient((id, done) => {
  const clientColl = foundation.db('oauthClients');

  if (ObjectId.isValid(id)) {
    clientColl.findOne({_id: ObjectId(id)}, (err, client) => {
      if (err) return done(err);
      if (!client) return done(new ObjectDoesnotExist(`client ${id} not found`));
      done(err);
    });
  } else {
    done(null, false);
  }
});

server.grant(oauth2orize.grant.code((client, redirectUri, user, ares, done) => {
  foundation.logger.info({
    redirectUri,
    client: client.name,
    user: user.profile.name
  }, `Granted access to ${client.name} for ${user.profile.name}`);

  const task = oauth2Model.generateToken.chain(token =>
    oauth2Model.saveAuthorizationCode(
      token, client._id.toHexString(), redirectUri, user._id.toHexString(), ares.scope
    ).map(() => token)
  );

  runTask(task, done);
}));

server.exchange(oauth2orize.exchange.code((client, code, redirectUri, done) => {
  foundation.logger.info({
    redirectUri,
    client: client.name,
    user: user.profile.name
  }, `Exchange oauth code to ${client.name} for ${user.profile.name}`);

  const task = oauth2Model.findAuthorizationCode(code)
    .chain(oauthCode => {
      if (!libmongodb.objectIDEquals(client._id, oauthCode.clientId)) return pure();
      if (redirectUri !== oauthCode.redirectUri) return pure();

      return oauth2Model.findOrCreateToken(
        oauthCode.userId,
        libmongodb.serializeObjectId(client._id)
      )
    });

  runTask(task, done);
}))

/**
 * user authorization
 */
export const authorization = [
  ensureLogin,
  server.authorization((clientKey, redirectUri, done) => {
    runTask(oauth2Model.findClientByClientKey(clientKey), (err, client) => {
      if (err) return done(err);

      if (!client) {
        const e1 = new Error("Invalid clientKey");
        e1.clientMismatch = true;
        return done(e1);
      }

      if (client.registeredRedirectUri !== redirectUri) {
        foundation.logger.warn({
          redirectUri: redirectUri,
          registeredUri: client.registeredRedirectUri,
          clientKey: clientKey
        }, "Provided redirectUri does not match registered URI for clientKey");

        const e2 = new Error("URI mismatch");
        e2.clientMismatch = true;
        return done(e2);
      }

      return done(null, client, redirectUri);
    });
  }),
  function authorizationDecision(req, res, next) {
    /* Is this client allowed to skip the authorization page? */
    if(req.oauth2.client.canSkipAuthorization) {
      return server.decision({ loadTransaction: false })(req, res, next);
    }

    // lets render then
    res.render('oauth/authorize_dialog.html', {
      transactionId: req.oauth2.transactionID,
      user: req.user,
      client: req.oauth2.client,
    });
  },
  function authorizationErrorHandler(err, req, res, next) {
    const missingParams = ['response_type', 'redirect_uri', 'client_id']
      .filter(param => !req.query[param]);

    const incorrectResponseType = req.query.response_type && req.query.response_type !== 'code';

    if (err.clientMismatch || missingParams.length || incorrectResponseType) {
      res.render('oauth/authorize_failed.html', {
        clientMismatch: !!err.clientMismatch,
        missingParams: missingParams.length && missingParams,
        incorrectResponseType: incorrectResponseType,
      });
    } else {
      /* Let the main error handler deal with this */
      next();
    }
  }
]

export const decision = [ensureLogin, server.decision()];

export const token = [
  passport.authenticate(['oauth2-client-password'], {failWithError: true, session: false}),
  server.token(),
  server.errorHandler()
]

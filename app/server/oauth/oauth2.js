import {runTask, pure} from '@jonggrang/task';
import oauth2orize from 'oauth2orize';
import {ObjectId} from 'mongodb';
import passport from 'passport';

import {foundation} from '../foundation';
import {ObjectDoesnotExist} from '../lib/errors';
import * as oauth2Model from './models';


const server = oauth2orize.createServer();


/**
 * serializer
 */
server.serializeClient((client, cb) => {
  cb(null, client._id.toHexString());
});

server.deserializeClient((id, cb) => {
  const clientColl = foundation.db('oauthClients');

  if (ObjectId.isValid(id)) {
    clientColl.findOne({_id: ObjectId(id)}, (err, client) => {
      if (err) return cb(err);
      if (!client) return cb(new ObjectDoesnotExist(`client ${id} not found`));
      cb(err);
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

  runTask(task, (err, token) => {
    if (err) return don(err);
    else done(null, token)
  });
}));

server.exchange(oauth2orize.exchange.code((client, code, redirectUri, done) => {
  foundation.logger.info({
    redirectUri,
    client: client.name,
    user: user.profile.name
  }, `Exchange oauth code to ${client.name} for ${user.profile.name}`);

  const task = oauth2Model.findAuthorizationCode(code)
    .chain(oauthCode => {
      if (!client._id.equals(oauthCode.clientId)) return pure();
      if (redirectUri !== oauthCode.redirectUri) return pure();
      // TODO: save this to access token
      return pure();
    });

  runTask(task, done);
}))

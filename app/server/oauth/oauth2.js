import oauth2orize from 'oauth2orize';
import {ObjectId} from 'mongodb';
import passport from 'passport';

import {foundation} from '../foundation';
import {ObjectDoesnotExist} from '../lib/errors';


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

  
}));
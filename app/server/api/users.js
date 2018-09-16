import passport from 'passport';

import {renderUserAsJson} from '../auth/model';
import {Router} from '../lib/router';


export function defineUserApiRoutes(foundation) {
  const app = Router();
  const handlers = defineUsersApiHandler(foundation);

  app.use(passport.authenticate('jwt', {session: false}));
  app.get('/whoami', {name: 'api.users.whoami'}, handlers.whoami);

  return app;
}

export function defineUsersApiHandler(foundation) {
  return {
    whoami(req, res) {
      res.json(renderUserAsJson(req.user));
    }
  };
}

import express from 'express';
import passport from 'passport';

import {renderUserAsJson} from '../auth/model';


export function defineUserApiRoutes(foundation) {
  const app = express.Router();
  const handlers = defineUsersApiHandler(foundation);

  app.use(passport.authenticate('jwt', {session: false}));

  app.get('/whoami', handlers.whoami);

  return app;
}

export function defineUsersApiHandler(foundation) {
  return {
    whoami(req, res) {
      res.json(renderUserAsJson(req.user))
    }
  };
}

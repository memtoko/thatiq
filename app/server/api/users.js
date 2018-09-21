import passport from 'passport';

import {renderUserAsJson} from '../auth/models';


export function defineUserApiRoutes(router, foundation) {
  const handlers = defineUsersApiHandler(foundation);

  router.group({
    middlewares: [passport.authenticate('jwt', {session: false})]
  }, () => {
    router.get('/whoami', {name: 'whoami'}, handlers.whoami);
  });
}

export function defineUsersApiHandler(foundation) {
  return {
    whoami(req, res) {
      res.json(renderUserAsJson(req.user));
    }
  };
}

import passport from 'passport';

import {renderUserAsJson} from '../auth/models';

export function defineUserApiRoutes(router) {

  router.group({
    middlewares: [passport.authenticate('jwt', {session: false})]
  }, () => {
    router.get('/whoami', {name: 'whoami'}, whoami);
  });
}

function whoami(req, res) {
  res.json(renderUserAsJson(req.user));
}

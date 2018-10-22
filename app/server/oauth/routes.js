import * as ouath2 from './oauth2';


/**
 * Define routes for oauth2
 *
 * @param {Router} router
 * @return {void}
 */
export function defineRoutes(router) {
  router.get('/authorize', {name: 'authorize'}, ouath2.authorization);
  router.get('/decision', {name: 'decision'}, ouath2.decision);
  router.on(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    '/token',
    {name: 'token'},
    ouath2.token
  );
}

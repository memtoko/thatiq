import {defineUserApiRoutes} from './users';


export function defineRoutes(router, foundation) {
  router.group({path: '/users', name: 'users'}, defineUserApiRoutes, foundation);
}

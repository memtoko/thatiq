import {defineUserApiRoutes} from './users';


export function defineRoutes(router) {
  router.group({path: '/users', name: 'users'}, defineUserApiRoutes);
}

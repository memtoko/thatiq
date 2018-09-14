import express from 'express';

import {defineUserApiRoutes} from './users';


export function defineRoutes(foundation) {
  const app = express.Router();

  app.use('/users', defineUserApiRoutes(foundation));

  return app;
}

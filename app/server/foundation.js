import pino from 'pino';

import {PBKDF2PasswordHasher} from './auth/hasher';
import {mongoConnect} from './lib/mongodb';
import {redisConnect} from './lib/redis';


export class Foundation {
  constructor(settings, mongoClient, redis) {
    this.settings = settings;
    this.mongoClient = mongoClient;
    this.db = mongoClient.db(settings.db.name);
    this.redis = redis;
    this.logger = makeLogger(settings.logging);
    this.hasher = new PBKDF2PasswordHasher();
  }
}

/**
 * create our app foundation
 *
 * @param {Object} appSettings
 * @return {Task}
 * @sig Object -> Task Foundation
 */
export function createFoundation(appSettings) {
  return mongoConnect(appSettings.db.mongoURI)
    .chain(client =>
      redisConnect(appSettings.db.redisURI)
        .map(redis =>
          new Foundation(appSettings, client, redis)
        ));
}

/**
 * return pino logger
 *
 * @param {Object} logSettings
 * @return {Logger}
 */
export function makeLogger(logSettings) {
  logSettings = logSettings || {};
  return pino({
    name: logSettings.name,
    level: logSettings.level,
    enabled: logSettings.enabled,
    prettyPrint: logSettings.prettyPrint,
  });
}

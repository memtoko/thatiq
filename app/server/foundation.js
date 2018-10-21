import pino from 'pino';

import {PBKDF2PasswordHasher} from './auth/hasher';
import {mongoConnect} from './lib/mongodb';
import {redisConnect} from './lib/redis';


export class Foundation {
  constructor(settings) {
    this.settings = settings;
    // this.mongoClient = mongoClient;
    // this.db = mongoClient.db(settings.db.name);
    this.redis = null;
    this.mongoClient = null;
    this.db = null;
    this.logger = null;
    this.hasher = new PBKDF2PasswordHasher();
  }
}

export const foundation = new Foundation({});

/**
 * create our app foundation
 *
 * @param {Object} appSettings
 * @return {Task}
 * @sig Object -> Task Foundation
 */
export function installFoundation(appSettings) {
  foundation.settings = appSettings;
  return mongoConnect(appSettings.db.uri)
    .chain(client =>
      redisConnect(appSettings.redis.uri)
        .map(redis => {
          foundation.redis = redis;
          foundation.mongoClient = client;
          foundation.db = client.db(appSettings.db.name);
          foundation.logger = makeLogger(appSettings.logging);
        }));
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

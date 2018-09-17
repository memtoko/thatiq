import {STATUS_CODES} from 'http';

import cookieParser from 'cookie-parser';
import express from 'express';
import expressPino from 'express-pino-logger';
import expressFlash from 'express-flash';
import session from 'express-session';
import passport from 'passport';
import * as T from '@jonggrang/task';
import { configure as createNunjuckConf } from 'nunjucks';

import {configurePassport} from './auth/passport';
import {loadDotenv} from './config/dotenv';
import {readConfig} from './config/parse';
import {SVGInlineExt} from './config/template';
import {createRedisStore} from './lib/session-redis';
import {defineRoutes} from './routes';


/**
 * read appSetting from configFile, optionally give it env file
 * to load before we parsing the config file.
 *
 * @property {String} configFile path to config file
 * @property {String?} envFile path to .env file
 * @returns {Tasks<AppSettings>}
 */
export function readAppSetings(configFile, envFile) {
  return T.apSecond(
    envFile ? loadDotenv({path: envFile}) : T.pure(null),
    readConfig(configFile)
  );
}

/**
 *
 * @param {Foundation} foundation
 * @return {Application}
 */
export function createApplication(foundation) {
  const {settings, redis} = foundation;
  const app = express();

  // settings for express
  app.disable('x-powered-by');
  app.set('trust proxy', settings.app.trustProxy);
  app.locals.app = Object.create(null);
  app.locals.app.name = settings.app.name || 'Thatiq';
  app.locals.app.debug = settings.app.debug || false;

  // logger
  app.use(expressPino({logger: foundation.logger}));

  app.use(cookieParser(settings.app.key));

  const RedisStorage = createRedisStore(session);
  app.use(session({
    store: new RedisStorage({client: redis, prefix: 'thatiq:sess:'}),
    secret: settings.app.key,
    resave: false,
    saveUninitialized: false,
    name: settings.session.cookieName,
    cookie: {
      httpOnly: settings.session.httpOnlyCookies,
      secure: settings.session.secureCookies,
      maxAge: settings.session.maxAge * 1000
    }
  }));
  app.use(expressFlash());

  // static file
  app.use(express.static(settings.staticFiles.root));

  configurePassport(foundation);
  app.use(passport.initialize());

  configureNunjucks(app, settings);

  defineRoutes(app, foundation);

  // error handler
  app.use(createErrorHandler(foundation));

  return app;
}

function createErrorHandler(foundation) {
  function renderErrorTemplate(res, tpl, error) {
    return T.makeTask_(cb => {
      const settings = foundation.settings || {};
      const appSettings = settings.app || {};
      const context = {
        error,
        title: STATUS_CODES[error.status] || 'Internal Server Error.',
        app: {
          name: appSettings.name || 'Thatiq',
          debug: typeof appSettings.debug !== 'boolean' ? false : appSettings.debug
        }
      };
      res.render(tpl, context, cb);
    });
  }

  function getAllTemplateErrors(codeStr) {
    let all = [];
    let item;
    for (let i = 0, len = codeStr.length; i < len; i++) {
      item = codeStr.slice(0, len - i);
      if (item.length !== len) item += 'x'.repeat(len - item.length)
      all.push(item)
    }
    // also include error.html just in case it's missing
    all.push('error');

    return all;
  }

  return function errorHandler(err, req, res, next) {
    if (res.headerSent) return next(err);
    err = err || {};
    const codeStr = '' + (err.status || 500);

    if (req.log === 'function') req.log.warn({err});

    const task = getAllTemplateErrors(codeStr).reduce(
      (prev, current) => prev.alt(renderErrorTemplate(res, current + '.html', err)),
      T.raise(new Error('no template found'))
    );

    T.runTask(task, (error, html) => {
      if (error) return next(error);

      res.status(err.code || 500).send(html);
    });
  };
}

function configureNunjucks(app, settings) {
  const viewSettings = settings.views || {};
  const staticSettings = settings.staticFiles || {};

  const env = createNunjuckConf(viewSettings.dir, {
    autoescape: viewSettings.autoescape,
    watch: viewSettings.watch,
    web: {
      useCache: viewSettings.useCache,
      async: true // use async
    },
    express: app
  });

  // we can configure env here
  env.addExtension('SVGInlineExtension', new SVGInlineExt(staticSettings));

  return env;
}

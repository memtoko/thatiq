import {STATUS_CODES} from 'http';

import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import express from 'express';
import expressPino from 'express-pino-logger';
import * as T from '@jonggrang/task';
import {configure as createNunjuckConf} from 'nunjucks';

import {configurePassport} from './auth/passport';
import {readConfig} from './config/parse';
import {SVGInlineExt} from './config/template';
import {foundation} from './foundation';
import {defineRoutes} from './routes';


/**
 * read appSetting from configFile
 *
 * @property {String} configFile path to config file
 * @returns {Tasks<AppSettings>}
 */
export function readAppSetings(configFile) {
  return readConfig(configFile);
}

/**
 * Create express application
 *
 * @return {Application}
 */
export function createApplication() {
  const {settings} = foundation;
  const app = express();

  // settings for express
  app.disable('x-powered-by');
  app.set('trust proxy', settings.trustProxy);
  app.locals.app = Object.create(null);
  app.locals.app.name = settings.name || 'Thatiq';
  app.locals.app.debug = settings.debug || false;

  // logger
  app.use(expressPino({logger: foundation.logger}));
  app.use(cookieParser(settings.key));

  // body parser
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({extended: false}));

  // static file
  if (settings.staticFiles.serveStatic) app.use(express.static(settings.staticFiles.root));

  configurePassport();
  configureNunjucks(app, settings);
  defineRoutes(app);

  // error handler
  app.use(createErrorHandler());

  return app;
}

function createErrorHandler() {
  function renderErrorTemplate(res, tpl, error) {
    return T.makeTask_(cb => {
      const settings = foundation.settings || {};
      const context = {
        error,
        title: STATUS_CODES[error.status] || 'Internal Server Error.',
        app: {
          name: settings.name || 'Thatiq',
          debug: typeof settings.debug !== 'boolean' ? false : settings.debug
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

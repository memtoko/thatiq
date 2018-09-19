import expressFlash from 'express-flash';
import session from 'express-session';
import passport from 'passport';

import {defineRoutes as authRoutes} from './auth/routes';
import {defineRoutes as apiRoutes} from './api/routes';
import {createRedisStore} from './lib/session-redis';
import {Router} from './lib/router';


/**
 * define routes
 *
 * @param {Application} app Express app
 * @param {Foundation} foundation
 * @returns {Void}
 */
export function defineRoutes(app, foundation) {
  const {settings, redis} = foundation;
  const router = Router();
  const RedisStorage = createRedisStore(session);

  router.group({
    name: 'web',
    middlewares: [
      session({
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
      }),
      expressFlash(),
      passport.initialize()
    ]
  }, () => {
    router.get('/', homeHandler);
    router.get('/favicon.ico', (req, res, next) => {
      req.url = '/static/images/favicon.ico';
      next();
    });

    router.group({path: '/auth', name: 'auth'}, authRoutes, foundation);
  });

  router.group({
    path: '/api',
    name: 'api',
    middlewares: [passport.initialize()]
  }, apiRoutes, foundation);

  app.use(router);
  // handle not found here
  app.use(render404Page);
}

function homeHandler(req, res, next) {
  const context = {
    title: 'The number one publishing platform',
    bodyClass: 'sh-head-transparent sh-foot-floating'
  };

  res.render('home.html', context, (err, html) => {
    if (err) return next(err);

    res.status(200).send(html);
  });
}

/**
 * @param {Request} req
 * @param {Response} res
 * @param {Function} next
 */
function render404Page(req, res, next) {
  res.render('404.html', {title: '404 Not Found'}, (err, html) => {
    if (err) return next(err);

    res.status(404).send(html);
  });
}

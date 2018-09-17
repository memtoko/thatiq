import {defineRoutes as authRoutes} from './auth/routes';
import {defineRoutes as apiRoutes} from './api/routes';
import {Router} from './lib/router';


/**
 * define routes
 */
export function defineRoutes(app, foundation) {
  const router = Router();

  router.get('/', homeHandler);
  router.get('/favicon.ico', (req, res, next) => {
    req.url = '/static/images/favicon.ico';
    next();
  });

  router.group({path: '/auth', name: 'auth'}, authRoutes, foundation);
  router.group({path: '/api', name: 'api'}, apiRoutes, foundation);

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
 *
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

import {defineRoutes as authRoutes} from './auth/routes';
import {defineRoutes as apiRoutes} from './api/routes';

/**
 * define routes
 */
export function defineRoutes(foundation, app) {
  app.get('/', homeHandler);
  app.get('/favicon.ico', (req, res, next) => {
    req.url = '/static/images/favicon.ico';
    next();
  });
  app.get('/test', function (req, res, next) {
    if (!req.session._testapp) {
      req.session._testapp = 0;
    }
    req.session._testapp += 1;

    return res.json({ test: req.session._testapp, settings: foundation.settings });
  });
  app.use('/auth', authRoutes(foundation));
  app.use('/api/', apiRoutes(foundation));
  // handle not found here
  app.use(render404Page);
}

function homeHandler(req, res, next) {
  const context = {
    title: 'The number one publishing platform',
    bodyClass: 'sh-head-transparent sh-foot-floating',
    secure: req.secure,
    forwarded: req.headers['x-forwarded-for'] || '',
    ip: req.ip,
    remote: req.connection.remoteAddress,
    headers: JSON.stringify(req.headers)
  }
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

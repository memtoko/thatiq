import {defineRoutes as authRoutes} from './auth/routes';

/**
 * define routes
 */
export function defineRoutes(foundation, app) {
  app.get('/', homeHandler);
  app.get('/favicon.ico', (req, res, next) => {
    req.url = '/static/images/favicon.ico';
    next();
  });
  app.use('/auth', authRoutes(foundation));

  // handle not found here
  app.use(render404Page);
}

function homeHandler(_, res, next) {
  const context = {
    title: 'The number one publishing platform',
    bodyClass: 'sh-head-transparent sh-foot-floating'
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

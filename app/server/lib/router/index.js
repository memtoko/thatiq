import FindMyWay from 'find-my-way';
import {mergeWith} from '@jonggrang/object';
import setPrototypeOf from 'setprototypeof';

import {Chain} from './chain';


export function Router() {
  function router(req, res, next) {
    router.handle(req, res, next);
  }

  setPrototypeOf(router, RouterProto);
  router.init();

  return router;
}

class Route {
  /**
   * @param {String} uri
   * @param {String[]} methods Route
   * @param {Function} action Route action
   */
  constructor(uri, methods, chain) {
    this.uri = uri;
    this.methods = methods;
    this.name = '';
    this.version = null;
    this.chain = chain;
  }

  run(req, res, next) {
    this.chain.run(req, res, next);
  }

  toJSON() {
    return {
      uri: this.uri,
      methods: this.methods,
      name: this.name,
      version: this.version,
      chain: `<chain ${this.chain.length}>`
    }
  }
}

const RouterProto = {
  init() {
    this._base = FindMyWay();
    this._registry = Object.create(null);
    this._groupStack = [];
    this._anonymousHandlerCounter = 0;
    this._globalMiddlewares = [];
  },

  on(methods, path, opts, ...handlers) {
    let options = {};
    if (typeof opts === 'function') handlers = [opts].concat(handlers);
    else options = opts;

    options.path = path;
    options.middlewares = this._globalMiddlewares.concat(handlers || []);

    if (this._groupStack.length > 0)
      options = mergeWith(this._groupStack[this._groupStack.length - 1], options, mergeGroupRouteFn);

    const chain = new Chain();
    const route = new Route(options.path, methods, chain);
    handlers = options.middlewares;

    if (options.name) route.name = options.name;

    handlers.forEach((handler) => {
      handler._name = handler.name || 'handler-' + this._anonymousHandlerCounter++;
      chain.add(handler);
    });

    if (options.version) {
      route.version = options.version;
      this._base.on(methods, options.path, {version: options.version}, runRoute, route);
    } else {
      this._base.on(methods, options.path, runRoute, route);
    }
    this._registry[options.name] = route;

    return route;
  },

  use(middleware) {
    this._globalMiddlewares.push(middleware);
  },

  group(opts, fn, ...args) {
    this._updateGroupStack(opts);

    fn.apply(null, [this].concat(args));

    this._groupStack.pop();
  },

  find(method, path, version) {
    return this._base.find(method, sanitizeUrl(path), version);
  },

  handle(req, res, _next) {
    const route = this.find(req.method, req.url, req.headers['accept-version']);
    if (!route) return next();

    const originalParams = req.params;
    function next(err) {
      // restore
      req.params = originalParams;
      _next(err);
    }
    req.params = route.params;
    route.handler(req, res, next, route.store);
  },

  _updateGroupStack(opts) {
    const len = this._groupStack.length;
    let attributes = opts;
    if (len > 0) {
      attributes = mergeWith(this._groupStack[len - 1], opts, mergeGroupRouteFn);
    }

    this._groupStack.push(attributes);
  }
};

['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].forEach(method => {
  RouterProto[method] = routeFactory(method);
});

function routeFactory(method) {
  return function route(path, opts, ...handlers) {
    this.on([method.toUpperCase()], path, opts, ...handlers);
  };
}

function mergeGroupRouteFn(k, v1, v2) {
  return k === 'name' ? `${v1}.${v2}`
    : k === 'middlewares' ? v1.concat(v2)
      : k === 'path' ? v1 + v2
        : v2;
}

function runRoute(req, res, next, route) {
  route.run(req, res, next);
}

function sanitizeUrl(url) {
  for (let i = 0, len = url.length; i < len; i++) {
    let charCode = url.charCodeAt(i);
    if (charCode === 63 || charCode === 35) {
      return url.slice(0, i);
    }
  }
  return url;
}

import {extend} from '../../utils/object';

export function Chain(opts) {
  opts = opts || {};

  this.onceNext = !!opts.onceNext;
  this.strictNext = !!opts.strictNext;

  if (this.strictNext) this.onceNext = true;

  this._stack = [];
}

extend(Chain.prototype, {
  getHandlers() {
    return this._stack;
  },

  add(handler) {
    handler._name = handler._name || handler.name;

    this._stack.push(handler);
  },

  get length() {
    return this._stack.length;
  },

  run(req, res, done) {
    const self = this;
    let index = 0;

    function next(err) {
      // next callback
      const handler = self._stack[index++];

      // all done or request closed
      if (!handler) return process.nextTick(done, err, req, res);

      // call the handler
      call(handler, err, req, res, next);
    }

    next();
  }
});

/**
 * Invoke a handler.
 *
 * @private
 * @param {Function} handler - handler function
 * @param {Error|false|*} err - error, abort when true value or false
 * @param {Request} req - request
 * @param {Response} res - response
 * @param {Function} _next - next handler
 * @returns {undefined} no return value
 */
function call(handler, err, req, res, next) {
  const arity = handler.length;
  const error = err;
  const hasError = err === false || Boolean(err);

  if (hasError && arity === 4) {
    // error-handling middleware
    handler(err, req, res, next);
    return;
  } else if (!hasError && arity < 4) {
    // request-handling middleware
    handler(req, res, next);
    return;
  }

  // continue
  next(error, req, res);
  return;
}

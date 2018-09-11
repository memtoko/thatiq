/**
 * Extends an object with own enumerable key/value pair from others.
 *
 * @param {Object} target
 * @param {Object} sources
 * @returns {Object}
 */
export function extend(target, ...sources) {
  sources.forEach(source => {
    Object.keys(source).forEach(key => {
      if (key === 'prototype') target[key] = source[key];
      else Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
    });

    Object.getOwnPropertySymbols(source).forEach(symbol => {
      Object.defineProperty(target, symbol, Object.getOwnPropertyDescriptor(source, symbol));
    });
  });

  return target;
}

/**
 * Transform own enumerable key/value pairs using
 * the given transformer function.
 *
 * @param {Object} obj
 * @param {Function} fn
 * @returns {Object}
 */
export function mapObject(obj, fn) {
  return Object.keys(obj).reduce((result, key) => {
    result[key] = fn(key, obj[key]);
    return result;
  }, {});
}

/**
 * @paran {Object} object
 * @returns {Boolean}
 * @sig (Any) => Boolean
 */
export function isPlainObject(object) {
  if (Object(object) !== object) return false;

  return !Object.prototypeOf(object)
  ||     !object.toString
  ||     (Object.prototype.toString.call(object) === object.toString());
}

import {URL} from 'url';

import {stringify as renderQuery} from 'qs';
import {just, nothing, mapMaybe} from '@jonggrang/prelude';
import {renderCookie, calculateCookieLife, cookieLifeExpired} from '@jonggrang/http-types';


/**
 * Build URL with query, if the url already have
 * query params, then query appended.
 *
 * @param {String} url
 * @param {Object} query
 * @returns {String}
 */
export function withQuery(url, query) {
  const uri = new URL(url);
  uri.search = (uri.search ? uri.search + '&' : '') + renderQuery(query);
  return uri.toString();
}

/**
 * reverse proxy ssl headers.
 * see: http://stackoverflow.com/a/16042648/369198
 */
const HTTPS_HEADERS = {
  'x-forwarded-protocol': 'https',
  'x-forwarded-ssl': 'on',
  'x-url-scheme': 'https',
  'x-forwarded-proto': 'https',
  'front-end-https': 'https'
};

/**
 * return true if incoming http headers contains known ssl reverse proxy
 * mentioned in `HTTP_HEADERS`.
 */
export function isSecureProxy(headers) {
  const keys = Object.keys(HTTPS_HEADERS);
  let k;
  for (let i = 0, len = keys.length; i < len; i++) {
    k = keys[i];
    if (headers[k] && headers[k] === HTTPS_HEADERS[k]) return true;
  }
  return false;
}

/**
 * Determine approot by
 * - respect request.connection.encrypted property, together with the following de facto standards reverse
 *   proxy headers.
 *
 * Normally trusting headers in this way is insecure, however in the case of approot
 * the worst that can happen is that the client will get an incorrect URL.
 * Note that this does not work for some situations, e.g.:
 * - Reverse proxies not setting one of the above mentioned headers
 * - Applications hosted somewhere besides the root of the domain name
 * - Reverse proxies that modify the host header
 */
export function smartAppRoot(request) {
  const secure = request.connection.encrypted || isSecureProxy(request.headers);
  const protocol = secure ? 'https' : 'http';
  const host = request.headers.host || request.headers['x-forwarded-host'] || 'localhost';
  return `${protocol}://${host}`;
}

export function originalURL(req, options) {
  options = options || {};

  const secure = req.connection.encrypted || isSecureProxy(req.headers)
    , host = req.headers['x-forwarded-host'] || req.headers.host
    , protocol = secure ? 'https' : 'http'
    , path = req.url || '';
  return protocol + '://' + host + path;
};

/**
 * Lookup cookie by name
 *
 * @param {String} name
 * @param {Array<Cookie>} cookies
 * @returns {Maybe<Cookie>}
 */
export function lookupCookie(name, cookies) {
  for (let i = 0, len = cookies.length; i < len; i++) {
    if (cookies[i].name === name) {
      return just(cookies[i]);
    }
  }
  return nothing;
}

/**
 * Get cookie value by name
 *
 * @param {String} name
 * @param {Array<Cookie>} cookies
 * @param {Maybe<String>}
 */
export function lookupCookieValue(name, cookies) {
  return mapMaybe(lookupCookie(name, cookies), getCookieValue);
}

function getCookieValue(cookie) {
  return cookie.value;
}

/**
 * Create expired Set-Cookie
 */
export function forgetCookie(cookie) {
  return renderCookie(
    calculateCookieLife(Date.now(), cookieLifeExpired),
    cookie
  );
}

/**
 * Merge v1 and v2 if both value are array
 */
export function mergeHeaders(_, v1, v2) {
  return Array.isArray(v1) && Array.isArray(v2) ? v1.concat(v2)
    : /* otherwise */ v1;
}

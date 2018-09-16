import * as jwt from 'jsonwebtoken';
import {makeTask_} from '@jonggrang/task';
import unidecode from 'unidecode';

import {has} from './object';


export const ASCII_LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
export const ASCII_UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const DIGITS = '0123456789';
export const PUNCTUATIONS = '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~';


/**
 * Return a unique identifier with the given `len`.
 *
 * @param {Number} length
 * @param {String} allowedChars
 */
export function getRandomString(length, allowedChars) {
  let buf = [],
    chars = allowedChars || ASCII_LOWERCASE + ASCII_UPPERCASE + DIGITS,
    charLength = chars.length,
    i;

  for (i = 0; i < length; i = i + 1) {
    buf.push(chars[randomInt(0, charLength - 1)]);
  }

  return buf.join('');
}

export function signPayload(payload, secret, opts) {
  return makeTask_(cb => {
    jwt.sign(payload, secret, {
      notBefore: '1',
      ...opts
    }, cb);
  });
}

export function verifyPayload(token, secret) {
  return makeTask_(cb => {
    return jwt.verify(token, secret, cb);
  });
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// []
export function safeString(str, opts) {
  options = options || {};

  if (str === null) str = '';

  // Handle the £ symbol separately, since it needs to be removed before the unicode conversion.
  str = str.replace(/£/g, '-');

  // Remove non ascii characters
  str = unidecode(str);

  // Replace URL reserved chars: `@:/?#[]!$&()*+,;=` as well as `\%<>|^~£"{}` and \`
  str = str.replace(/(\s|\.|@|:|\/|\?|#|\[|\]|!|\$|&|\(|\)|\*|\+|,|;|=|\\|%|<|>|\||\^|~|"|\{|\}|`|–|—)/g, '-')
  // Remove apostrophes
    .replace(/'/g, '')
    // Make the whole thing lowercase
    .toLowerCase();

  if (!has(opts, 'importing') || !opts.importing) {
    // Convert 2 or more dashes into a single dash
    str = str.replace(/-+/g, '-')
    // Remove trailing dash
      .replace(/-$/, '')
      // Remove any dashes at the beginning
      .replace(/^-/, '');
  }

  str = str.trim();

  return str;
}

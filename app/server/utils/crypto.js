import * as jwt from 'jsonwebtoken';
import unidecode from 'unidecode';
import {randomBytes} from '@jonggrang/cryptic';
import {makeTask_, pure, co, raise} from '@jonggrang/task';

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

export function randomString(len, allowedChars) {
  if (len < 1) return pure(false);

  allowedChars = allowedChars || ASCII_LOWERCASE + ASCII_UPPERCASE + DIGITS + PUNCTUATIONS;

  const charLen = allowedChars.length;
  if (charLen === 0) return pure(false);

  return co(function* () {
    let random = yield randomInts(2 * len);

    const mask = getMinimalBitMask(charLen - 1);
    let result = '';

    let iterLimit = Math.max(len, len * 64), randIdx = 0;

    while (result.length < len) {
      if (randIdx >= random.length) {
        random = yield randomInts(2 * (len - result.length));
        randIdx = 0;
      }

      let c = random[randIdx++] & mask;
      if (c < charLen) result += allowedChars[c];

      iterLimit--;
      if (iterLimit <= 0) {
        return raise(new Error('Hit iteration limit when generating random string.'));
      }
    }
    return pure(result);
  });
}

export function randomInts(len) {
  if (len <= 0) return pure([]);
  return randomBytes(len * 4)
    .map(bytes => {
      let xs = [];
      for (let i = 0; i < len; ++i) {
        let x = 0;
        for (let j = 0; j < 4; ++j) {
          x = (x << 8) | (bytes[i * 4 + j] & 0xFF);
        }
        x = x & 2147483647;
        xs.push(x);
      }
      return xs;
    });
}

export function constantTimeEquals(a, b) {
  // Ideally this would be a native function, so it's less sensitive to how the
  // JS engine might optimize.
  if (a.length !== b.length) {
    return false;
  }
  let ret = 0;
  for (let i = 0; i < a.length; i++) {
    ret |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return ret === 0;
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

function getMinimalBitMask(to) {
  if (to < 1) {
    throw new TypeError(
      'the argument passed to getMinimalBitMask must be a positive integer'
    );
  }
  let mask = 1;
  while (mask < to) {
    mask = (mask << 1) | 1;
  }
  return mask;
}

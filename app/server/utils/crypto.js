import * as jwt from 'jsonwebtoken';
import {makeTask_} from '@jonggrang/task';


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

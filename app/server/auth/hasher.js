import {pbkdf2} from 'crypto';

import {makeTask_, raise, pure} from '@jonggrang/task';

import {NotImplementedError} from '../lib/errors';
import {constantTimeEquals, randomString} from '../utils/crypto';


/**
 * @param {String} hash
 * @param {Number} show
 * @param {String} char
 * @returns {String}
 */
export function maskHash(hash, show = 6, char = '*') {
  let masked = hash.slice(0, show);
  masked += char.repeat(hash.length - masked.length);
  return masked;
}

export class BasePasswordHasher {
  /**
   * Generate a cryptographically secure nonce salt in ASCII.
   *
   * @return {Task<string>}
   */
  salt() {
    return randomString(12);
  }

  /**
   * Check if the given password is correct.
   *
   * @param {String} password
   * @param {String} encoded
   * @returns {Task<boolean>}
   */
  verify(password, encoded) {
    return raise(new NotImplementedError(
      'subclasses of BasePasswordHasher must provide a verify() method'
    ));
  }

  /**
   * Create an encoded database value.
   *
   * the result is normally formatted as "algorithm$salt$hash" and
   * must be fewer than 128 characters.
   *
   * @param {String} password
   * @param {String} salt
   * @returns {Task<String>}
   */
  encode(password, salt) {
    return raise(new NotImplementedError(
      'subclasses of BasePasswordHasher must provide an encode() method'
    ));
  }

  /**
   * Return a summary of safe values.
   *
   * The result is a dictionary and will be used where the password field
   * must be displayed to construct a safe representation of the password.
   * @param {String} encoded
   * @return {Object}
   */
  safeSummary(encoded) {
    return new NotImplementedError(
      'subclasses of BasePasswordHasher must provide a safe_summary() method'
    );
  }

  /**
   *
   * @param {String} encoded
   * @return {Task<boolean>}
   */
  mustUpdate(encoded) {
    return pure(false);
  }

  /**
   *
   * @param {String} password
   * @param {String} encoded
   * @returns {Task<void>}
   */
  hardenRuntime(password, encoded) {
    return raise(new NotImplementedError(
      'subclasses of BasePasswordHasher should provide a harden_runtime() method'
    ));
  }
}

/**
 * Secure password hashing using the PBKDF2 algorithm
 */
export class PBKDF2PasswordHasher extends BasePasswordHasher {
  constructor(iterations = 150000, digest = 'sha256') {
    super();
    this.iterations = iterations;
    this.algorithm = 'pbkdf2_' + digest;
    this.digest = digest;
  }

  encode(password, salt, iterations) {
    return makeTask_(cb => {
      const algorithm = this.algorithm;
      iterations = iterations || this.iterations;
      pbkdf2(password, salt, iterations, 64, this.digest, (err, derived) => {
        if (err) return cb(err);

        const hash = derived.toString('base64');
        cb(null, `${algorithm}$${iterations}$${salt}$${hash}`);
      });
    });
  }

  verify(password, encoded) {
    const [algorithm, iterations, salt] = encoded.split('$', 4);
    return algorithm !== this.algorithm
      ? raise(new Error('invalid hasher algorithm'))
      : this.encode(password, salt, parseInt(iterations, 10))
          .map(xs => constantTimeEquals(encoded, xs));
  }

  safeSummary(encoded) {
    const [algorithm, iterations, salt, hash] = encoded.split('$', 4);
    return {
      algorithm,
      iterations,
      salt: maskHash(salt),
      hash: maskHash(hash)
    };
  }

  mustUpdate(encoded) {
    const [_, iterations] = encoded.split('$', 4);
    return pure(parseInt(iterations, 10) !== this.iterations);
  }

  hardenRuntime(password, encoded) {
    const [_, iterations, salt] = encoded.split('$', 4);
    const extraIterations = this.iterations - parseInt(iterations, 10);
    return extraIterations
      ? this.encode(password, salt, extraIterations)
      : pure(void 0);
  }
}

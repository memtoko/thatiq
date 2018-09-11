import {pure} from '@jonggrang/task';

import {AppCtx} from '../lib/app-ctx';
import {updateOne} from '../lib/mongodb';


/**
 * encode password
 *
 * @param {String} plainPassword
 * @return {ReaderT}
 */
export function encodePassword(plainPassword) {
  return new AppCtx(app => {
    const hasher = app.hasher;
    return hasher.salt()
      .chain(salt => hasher.encode(plainPassword, salt));
  });
}

/**
 * Set user password for the given id
 *
 * @param {ObjectId} id
 * @param {String} plainPassword
 * @return {ReaderT}
 */
export function setPassword(id, plainPassword) {
  return encodePassword(plainPassword)
    .chain(password => updateOne('users', {_id: id}, {$set: {password}}));
}

/**
 * Return a boolean of whether the raw password
 *
 * @param {BasePasswordHasher} hasher
 * @param {String} password
 * @param {String} encoded
 * @param {Function} setter
 * @return {ReaderT}
 * @sig String -> String -> (String -> ReaderT App Task void) -> ReaderT App Task Bool
 */
export function checkPassword(password, encoded, setter) {
  return new AppCtx(app => {
    const hasher = app.hasher;
    return hasher.verify(password, encoded)
      .chain(isCorrect =>
        hasher.mustUpdate(encoded)
          .chain(mupdated =>
            mupdated && typeof setter === 'function' ? setter(password).run(app)
              : pure(null))
          .map(() => isCorrect)
      )
  });
}

/**
 * create user documents
 *
 * @param {String} email
 * @param {String} plainPassword
 * @param {Object} profile
 * @param {Object} extraFields
 * @returns {ReaderT}
 */
export function createUserDocument(email, plainPassword, profile, extraFields) {
  return encodePassword(plainPassword)
    .map(password =>
      Object.assign({
        email,
        password,
        profile,
        isSuperuser: false,
        isStaff: false
      }, extraFields));
}

/**
 * create super user documents
 * @param {String} email
 * @param {String} plainPassword
 * @param {Object} profile
 * @param {Object} extraFields
 * @returns {ReaderT}
 */
export function createSuperuserDocument(email, plainPassword, profile, extraFields) {
  return encodePassword(plainPassword)
    .map(password =>
      Object.assign({
        email,
        password,
        profile,
        isSuperuser: true,
        isStaff: true
      }, extraFields));
}

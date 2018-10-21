import {node, pure, sequencePar_} from '@jonggrang/task';

import {foundation} from '../foundation';
import {updateOne, upsert} from '../lib/mongodb';


/**
 * The collections defined here are:
 *
 * Embedded
 * Profile = {
 *  name:: String,
 *  picture:: String,
 *  bio: String,
 *  web:: String,
 * }
 *
 * User = {
 *  profile: Profile,
 *  email:: String,
 *  password:: String,
 *  isSuperuser:: Boolean,
 *  isStaff:: Boolean,
 *  createdAt:: Date,
 *  isActive:: Boolean
 * }
 *
 * Provider = {
 *  name:: String,
 *  key:: String,
 *  user: ObjectId
 * }
 */

/**
 * encode password
 *
 * @param {String} plainPassword
 * @return {Task}
 */
export function encodePassword(plainPassword) {
  const hasher = foundation.hasher;
  return hasher.salt()
    .chain(salt => hasher.encode(plainPassword, salt));
}

/**
 * Set user password for the given id
 *
 * @param {ObjectId} id
 * @param {String} plainPassword
 * @return {Task}
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
 * @return {Task}
 * @sig String -> String -> (String -> Task void) -> Task Bool
 */
export function checkPassword(password, encoded, setter) {
  const hasher = foundation.hasher;
  return hasher.verify(password, encoded)
    .chain(isCorrect =>
      hasher.mustUpdate(encoded)
        .chain(mupdated =>
          mupdated && typeof setter === 'function' ? setter(password)
            : pure(null))
        .map(() => isCorrect)
    );
}

export function newUser(opts, provider) {
  const userData = {
    profile: opts.profile,
    email: opts.email.toLowerCase(),
    password: opts.password,
    isSuperuser: opts.isSuperuser == null ? false : opts.isSuperuser,
    isStaff: opts.isStaff == null ? false : opts.isStaff,
    isActive: opts.isActive == null ? true : opts.isActive,
  };
  return upsert(
    'users',
    {email: user.email},
    {$set: userData, $setOnInsert: {createdAt: new Date()}},
  ).chain((user) => {
      if (!provider) return pure(user);

      const authProvider = {
        name: provider.name,
        key: provider.key,
        user: user._id
      };

      return upsert('authProviders',
        {name: provider.name, user: user._id},
        {$set: authProvider}
      ).map(() => user);
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
        isStaff: false,
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
        isStaff: true,
      }, extraFields));
}

export function renderUserAsJson(user) {
  return {
    id: user._id.toHexString(),
    email: user.email,
    profile: user.profile
  };
}

export function createAuthIndexes(db) {
  const providerColl = db.collection('authProviders');
  const userColl = db.collection('users');

  return sequencePar_([
    node(
      providerColl,
      {name: 1, key: 1},
      {unique: true, sparse: true},
      providerColl.createIndex
    ),
    node(
      providerColl,
      {user: 1},
      providerColl.createIndex
    ),

    node(
      userColl,
      {email: 1},
      {unique: true},
      userColl.createIndex
    )
  ]);
}

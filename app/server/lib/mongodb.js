import {MongoClient} from 'mongodb';
import {node} from '@jonggrang/task';

import {makeDbAction} from './app-ctx';
import {safeString} from '../utils/crypto';
import {has} from '../utils/object';

/**
 * Connect mongo client
 *
 * @param {String} uri
 * @returns {Task}
 * @sig String -> Task MongoClient
 */
export function mongoConnect(uri) {
  return node(null, uri, {useNewUrlParser: true}, MongoClient.connect);
}

/**
 * Close mongo connection
 *
 * @param {MongoClient} client
 * @return {Task}
 * @sig MongoClient -> Task void
 */
export function mongoClose(client) {
  return node(client, client.close);
}

/**
 * insert one document to given collections
 *
 * @param {String} coll Collection name
 * @param {Object} docs Document to insert
 * @returns {ReaderT}
 */
export function insertOne(coll, docs) {
  return makeDbAction((db, cb) => {
    db.collection(coll).insertOne(docs, cb);
  });
}

/**
 * findOne
 *
 * @param {String}
 * @param {Object}
 */
export function findOne(coll, query, options) {
  return makeDbAction((db, cb) => {
    db.collection(coll).findOne(query, options, cb);
  });
}

/**
 * findOneAndUpdate
 */
export function findOneAndUpdate(coll, query, update, options) {
  return makeDbAction((db, cb) => {
    db.collection(coll).findOneAndUpdate(query, update, options, cb);
  });
}

/**
 * updateOne
 *
 * @param {String} coll
 * @param {Object} filter
 * @param {Object} update
 * @param {Object} opts
 */
export function updateOne(coll, filter, update, opts) {
  return makeDbAction((db, cb) => {
    db.collection(coll).updateOne(filter, update, opts, cb);
  });
}

export function leanUpsert(coll, query, setOpts) {
  return findOneAndUpdate(coll, query, setOpts, {upsert: true, returnOriginal: false})
    .map(result => {

    });
}

/**
 * Generate slug for given coll
 *
 * @param {String} coll
 * @param {String} base
 * @param {Object} opts
 * @returns {ReaderT}
 */
export function generateSlug(coll, base, opts) {
  return makeDbAction((db, cb) => {
    let slug, slugTryCount = 1, baseName = coll, longSlug;

    function checkIfSlugExists(slugToFind, done) {
      let args = {slug: slugToFind};
      if (opts.status) args.status = opts.status;

      db.collection(coll).findOne(args, (err, found) => {
        if (err) return done(err);

        if (!found) return done(null, slugToFind);

        slugTryCount += 1;

        // If we shortened, go back to the full version and try again
        if (slugTryCount === 2 && longSlug) {
          slugToFind = longSlug;
          longSlug = null;
          slugTryCount = 1;
          return checkIfSlugExists(slugToFind, done);
        }

        // If this is the first time through, add the hyphen
        if (slugTryCount === 2) {
          slugToFind += '-';
        } else {
          // Otherwise, trim the number off the end
          trimSpace = -(String(slugTryCount - 1).length);
          slugToFind = slugToFind.slice(0, trimSpace);
        }

        slugToFind += slugTryCount;

        return checkIfSlugExists(slugToFind, done);
      });
    }

    slug = safeString(base, options);

    if (slug.length > 185) {
      if (!has(opts, 'importing') || !opts.importing) {
        slug = slug.slice(0, 185);
      }
    }

    if (!has(opts, 'importing') || !opts.importing) {
      // This checks if the first character of a tag name is a #. If it is, this
      // is an internal tag, and as such we should add 'hash' to the beginning of the slug
      if (baseName === 'tags' && /^#/.test(base)) {
        slug = 'hash-' + slug;
      }
    }

    checkIfSlugExists(slug, cb);
  });
}

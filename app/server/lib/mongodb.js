import {MongoClient, ObjectID} from 'mongodb';
import {node, makeTask_} from '@jonggrang/task';

import {foundation} from '../foundation';
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
  return makeTask_(cb => {
    foundation.db.collection(coll).insertOne(docs, cb);
  });
}

/**
 * findOne
 *
 * @param {String}
 * @param {Object}
 */
export function findOne(coll, query, options) {
  return makeTask_((cb) => {
    foundation.db.collection(coll).findOne(query, options, cb);
  });
}

/**
 * findOneAndUpdate
 */
export function findOneAndUpdate(coll, query, update, options) {
  return makeTask_((cb) => {
    foundation.db.collection(coll).findOneAndUpdate(query, update, options, cb);
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
  return makeTask_((cb) => {
    foundation.db.collection(coll).updateOne(filter, update, opts, cb);
  });
}

export function upsert(coll, query, setOpts) {
  return findOneAndUpdate(coll, query, setOpts, {upsert: true, returnOriginal: false})
    .map(result => result.value);
}

export function deleteMany(coll, query, opts) {
  return makeTask_(cb => {
    foundation.db.collection(coll).deleteMany(query, opts);
  })
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
  return makeTask_((cb) => {
    let slug, slugTryCount = 1, baseName = coll, longSlug;

    function checkIfSlugExists(slugToFind, done) {
      let args = {slug: slugToFind};
      if (opts.status) args.status = opts.status;

      foundation.db.collection(coll).findOne(args, (err, found) => {
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

// Utility functions

/**
 *
 */
export function objectIDEquals(a, b) {
  if (a === b) return true;
  if (!a) return !b;
  if (!b) return false;

  if (typeof a === 'string') {
    if (typeof b === 'string') {
      return a === b;
    }
    // assume b is ObjectId here
    return b.equals(a);
  }

  if (typeof b === 'string') {
    return a.equals(b);
  } else if (b.toHexString) {
    return a.equals(b.toHexString());
  } else {
    return a.equals(b);
  }
}

export function strToObjectId(str) {
  if (ObjectID.isValid(str)) return new ObjectID(str);

  throw new Error(`Invalid ObjectID ${str}`);
}

export function asObjectId(id) {
  if (!id) {
    return null;
  }

  if (typeof id === 'string') {
    return stringToObjectID(id);
  }

  return id;
}

export function getDateFromObjectId(id) {
  if( !id) {
    return null;
  }

  if (typeof id === 'string') {
    const objectId = stringToObjectID(id);
    return objectId.getTimestamp();
  }

  return id.getTimestamp();
}

export function getTimestampFromObjectId(id) {
  const d = getDateFromObjectId(id);
  if(d) return d.getTime();

  return null;
}

export function getNewObjectIdString() {
  var objectId = new ObjectID();
  return objectId.valueOf();
}


export function serializeObjectId(id) {
  if (!id) return id;
  if (typeof id === 'string') { return id; }
  return id.toHexString();
}

export function isMongoError(err) {
  // instanceof is not suitable since there may be multiple instances of
  // mongo driver loaded
  return err && err instanceof Error && err.name === 'MongoError';
}

export function mongoErrorWithCode(code) {
  return function(err) {
    return isMongoError(err) && err.code === code;
  }
}

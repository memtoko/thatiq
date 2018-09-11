import {MongoClient} from 'mongodb';
import {node} from '@jonggrang/task';

import {makeDbAction} from './app-ctx';

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
export function findOne(coll, query, projection) {
  return makeDbAction((db, cb) => {
    db.collection(coll).findOne(query, projection, cb);
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

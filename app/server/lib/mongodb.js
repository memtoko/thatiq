import {MongoClient} from 'mongodb';
import {node} from '@jonggrang/task';


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

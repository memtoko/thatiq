import {pure} from '@jonggrang/task';
import LRU from 'lru-cache';

import * as libmongodb from '../lib/mongodb';


export function MongodbCache(opts) {
  this.collection = opts.collection;
  this.cache = LRU({
    max: opts.max || 128,
    maxAge: opts.maxAge || 60 * 1000 // 1 minute
  });
}

MongodbCache.prototype.findById = function findById(id) {
  id = libmongodb.serializeObjectId(id);
  if (!id) return pure();

  const cached = cache.get(id);
  if (cached) return pure(Object.assign({}, cached));

  return libmongodb.findOne(this.collection, {_id: id}).map(doc => {
    if (!doc) return;

    doc.id = libmongodb.serializeObjectId(doc._id);
    cache.set(id, doc);
    return doc;
  });
}

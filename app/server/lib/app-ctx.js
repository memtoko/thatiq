import {makeTask_} from '@jonggrang/task';

import {ReaderT} from './reader';


export {ReaderT as AppCtx};

/**
 * create AppCtx with function that accept app and callback
 *
 * @param {Function} action
 * @returns {ReaderT}
 */
export function makeAppCtx(action) {
  return new ReaderT(app => makeTask_(cb => action(app, cb)));
}

/**
 * create AppCtx that operate on app's db property
 *
 * @param {Function} action
 * @returns {ReaderT}
 */
export function makeDbAction(action) {
  return makeAppCtx((app, cb) => action(app.db, cb));
}

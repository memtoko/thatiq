import {Task} from '@jonggrang/task';

import {defineAliases} from '../utils/define-aliases'
import {extend} from '../utils/object';



function o(f, g) {
  return x => f(g(x));
}

export function makeReaderT(monad) {
  function ReaderT(fn) {
    this.fn = fn;
  }

  /**
   * @sign ((m1 a -> m2 b), ReaderT r m1 a) => ReaderT r m2 b
   */
  ReaderT.mapReaderT = function mapReaderT(f, rd) {
    return new ReaderT(o(f, rd.fn));
  }

  /**
   * @sig ((r2 -> r1), ReaderT r1 m a) => ReaderT r2 m a
   */
  ReaderT.withReaderT = function withReaderT(f, rd) {
    return new ReaderT(o(rd.fn, f));
  }

  ReaderT.of = function of(x) {
    return new ReaderT(() => monad.of(x));
  }

  ReaderT.lift = function lift(lifting) {
    return new ReaderT(() => lifting);
  }

  /**
   * @param {Function} fn
   * @return {ReaderT}
   * @sig ()
   */
  ReaderT.liftWith = function liftWith(fn) {
    return new ReaderT(r => fn(t => t.run(r)));
  }

  ReaderT.restoreT = function restoreT(act) {
    return new ReaderT(() => act);
  }

  if (monad.throwError) {
    ReaderT.throwError = function (err) {
      return new ReaderT(() => monad.throwError(err));
    }
  }

  extend(ReaderT.prototype, {
    map(fn) {
      return ReaderT.mapReaderT(ma => ma.map(fn), this);
    },

    apply(that) {
      return new ReaderT(x => this.fn(x).ap(that.fn(x)));
    },

    chain(fn) {
      return new ReaderT(r => this.fn(r).chain(a => fn(a).fn(r)));
    },

    run(env) {
      return this.fn(env);
    }
  });

  if (typeof monad.prototype['fantasy-land/alt'] === 'function') {
    ReaderT.prototype.or = function or(other) {
      return new ReaderT(r => this.fn(r)['fantasy-land/alt'](other.fn(r)));
    }
  }

  if (typeof monad['fantasy-land/empty'] === 'function') {
    ReaderT.empty = function empty() {
      return new ReaderT(() => monad['fantasy-land/empty']());
    }
  }

  defineAliases(ReaderT);
  defineAliases(ReaderT.prototype);

  return ReaderT;
}

// Reader applied to `Task`
export const ReaderT = makeReaderT(Task);

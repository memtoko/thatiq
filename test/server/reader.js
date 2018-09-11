import {property} from 'jsverify';
import * as T from '@jonggrang/task';
import {deepEq} from '@jonggrang/prelude';

import {ReaderT} from '../../app/server/lib/reader';
import * as fl from '../../app/server/utils/fantasy';


function equals(xs) {
  return deepEq(xs[0], xs[1]);
}

describe('ReaderT', () => {
  describe('Functor instance', () => {
    property('identity', 'nat', (n) =>
      T.toPromise(T.bothPar(
          ReaderT.of(n).map(x => x).run({}),
          ReaderT.of(n).run({})
        ).map(equals)
      )
    );

    property('compose', 'nat', 'nat -> nat', 'nat -> nat', (n, f, g) =>
      T.toPromise(T.bothPar(
          ReaderT.of(n).map(x => f(g(x))).run({}),
          ReaderT.of(n).map(g).map(f).run({})
        ).map(equals)
      )
    );
  });

  describe('Apply instance', () => {
    property('composition', 'nat', 'nat -> nat', 'nat -> nat', (n, f, g) =>
      T.toPromise(T.bothPar(
          ReaderT.of(n)[fl.ap](ReaderT.of(g)[fl.ap](ReaderT.of(f).map(fn => gn => x => fn(gn(x))))).run({}),
          ReaderT.of(n)[fl.ap](ReaderT.of(g))[fl.ap](ReaderT.of(f)).run({})
        ).map(equals)
      )
    );
  });

  describe('Applicative instance', () => {
    property('identity', 'nat', a =>
      T.toPromise(T.bothPar(
          ReaderT.of(a)[fl.ap](ReaderT.of(x => x)).run({}),
          ReaderT.of(a).run({})
        ).map(equals)
      )
    );

    property('homomorphism', 'nat', 'nat -> nat', (a, f) =>
      T.toPromise(T.bothPar(
          ReaderT.of(a)[fl.ap](ReaderT.of(f)).run({}),
          ReaderT.of(f(a)).run({})
        ).map(equals)
      )
    );

    property('interchange', 'nat', 'nat -> nat', (a, f) =>
      T.toPromise(T.bothPar(
          ReaderT.of(a)[fl.ap](ReaderT.of(f)).run({}),
          ReaderT.of(f)[fl.ap](ReaderT.of(g => g(a))).run({})
        ).map(equals)
      )
    );
  });
});

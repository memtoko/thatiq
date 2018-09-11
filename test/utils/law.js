import { property } from 'jsverify'

import * as fl from '../../app/server/utils/fantasy';


const defaultEquals = (a, b) => a[fl.equals](b)

/**
 * Law for Setoid
 */
const Setoid = type => {
  describe('Setoid instance', () => {
    const { equals } = fl

    property('reflexivity', 'nat', v => {
      const a = type(v)
      return a[equals](a) === true
    })

    property('symmetry', 'nat', 'nat', (a, b) => {
      const s1 = type(a)
      const s2 = type(b)
      return s1[equals](s2) === s2[equals](s1)
    })

    property('transitivity', 'nat', a => {
      const s1 = type(a)
      const s2 = type(a)
      const s3 = type(a)

      return s1[equals](s2)
      &&     s2[equals](s3)
      &&     s1[equals](s3)
    })
  })
}

const Semigroup = (type, equals = defaultEquals) => {
  const { concat } = fl
  describe('Semigroup instance', () => {
    property('associativity', 'string', 'string', 'string', (a, b, c) =>
      equals(
        type(a)[concat](type(b))[concat](type(c)),
        type(a)[concat](type(b)[concat](type(c)))
      )
    )
  })
}

const Monoid = (type, equals = defaultEquals) => {
  const { concat, empty } = fl

  describe('Monoid instance', () => {
    property('right identity', 'string', (a) =>
      equals(type(a)[concat](type[empty]()), type(a))
    )

    property('left identity', 'string', (a) =>
      equals(type()[empty]()[concat](type(a)), type(a))
    )
  })
}

const Functor = (type, equals = defaultEquals) => {
  const { map } = fl

  describe('Functor instance', () => {
    property('identity', 'nat', (a) =>
      equals(type(a)[map](a => a), type(a))
    )

    property('composition', 'nat', 'nat -> nat', 'nat -> nat', (a, f, g) =>
      equals(
        type(a)[map](x => f(g(x))),
        type(a)[map](g)[map](f)
      )
    )
  })
}

const Apply = (type, equals = defaultEquals) => {
  const { ap, map } = fl;

  describe('Apply instance', () => {
    property('composition', 'string', 'string -> string', 'string -> string', (a, f, g) =>
      equals(
        type(a)[ap](type(g)[ap](type(f)[map](f => g => x => f(g(x))))),
        type(a)[ap](type(g))[ap](type(f))
      )
    )
  })
}


const Applicative = (type, equals = defaultEquals) => {
  const { ap, of } = fl

  describe('Applicative instance', () => {
    property('identity', 'nat', (a) =>
      equals(
        type(a)[ap](type()[of](x => x)),
        type(a)
      )
    )

    property('homomorphism', 'nat', 'nat -> nat', (a, f) =>
      equals(
        type()[of](a)[ap](type()[of](f)),
        type()[of](f(a))
      )
    )

    property('interchange', 'nat', 'nat -> nat', (a, f) =>
      equals(
        type()[of](a)[ap](type(f)),
        type(f)[ap](type()[of](f => f(a)))
      )
    )
  })
}


const Chain = (type, equals = defaultEquals) => {
  const { chain } = fl

  describe('Chain instance', () => {
    property('associativity', 'nat', 'nat -> nat', 'nat -> nat', (a, rf, rg) => {
      const f = (x) => type(rf(x))
      const g = (x) => type(rg(x))

      return equals(
        type(a)[chain](f)[chain](g),
        type(a)[chain](x => f(x)[chain](g))
      )
    })
  })
}


const Monad = (type, equals = defaultEquals) => {
  const { chain, of } = fl

  describe('Monad instance', () => {
    property('left identity', 'nat', 'nat -> nat', (a, rf) => {
      const f = (x) => type(rf(x))

      return equals(
        type()[of](a)[chain](f),
        f(a)
      )
    })

    property('right identity', 'nat', (a) =>
      equals(
        type(a)[chain](x => type()[of](x)),
        type(a)
      )
    )
  })
}


const Bifunctor = (type, equals = defaultEquals) => {
  const { bimap } = fl

  describe('Bifunctor instance', () => {
    property('identity', 'nat', 'nat', (a, b) =>
      equals(
        type(a, b)[bimap](a => a, b => b),
        type(a, b)
      )
    )

    property('composition', 'nat', 'nat', 'nat -> nat', 'nat -> nat', 'nat -> nat', 'nat -> nat', (a, b, f, g, h, i) =>
      equals(
        type(a, b)[bimap](
          a => f(g(a)),
          b => h(i(b))
        ),
        type(a, b)[bimap](g, i)[bimap](f, h)
      )
    )
  })
}

const Alt = (type, equals = defaultEquals) => {
  const { alt, map } = fl

  describe('Alt instance', () => {
    property('associativity', 'nat', 'nat', 'nat', (a, b, c) =>
      equals(
        type(a)[alt](type(b))[alt](type(c)),
        type(a)[alt](type(b)[alt](type(c)))
      )
    )

    property('distributivity', 'nat', 'nat', 'nat -> nat', (a, b, f) =>
      equals(
        type(a)[alt](type(b))[map](f),
        type(a)[map](f)[alt](type(b)[map](f))
      )
    )
  })
}

const Plus = (type, equals = defaultEquals) => {
  const { alt, zero, map } = fl

  describe('Plus instance', () => {
    property('right identity', 'nat', a =>
      equals(
        type()[zero]()[alt](type(a)),
        type(a)
      )
    )

    property('left identity', 'nat', a =>
      equals(
        type(a)[alt](type()[zero]()),
        type(a)
      )
    )

    property('annihilation', 'nat -> nat', f =>
      equals(
        type()[zero]()[map](f),
        type()[zero]()
      )
    )
  })
}

const Alternative = (type, equals = defaultEquals) => {
  const { zero, alt, ap } = fl

  describe('Alternative instance', () => {
    property('distributivity', 'nat', 'nat -> nat', 'nat -> nat', (a, f, g) =>
      equals(
        type(a)[ap](type(f)[alt](type(g))),
        type(a)[ap](type(f))[alt](type(a)[ap](type(g)))
      )
    )

    property('annihilation', 'nat', a =>
      equals(
        type(a)[ap](type()[zero]()),
        type()[zero]()
      )
    )
  })
}

export {
  Setoid,
  Semigroup,
  Monoid,
  Functor,
  Apply,
  Applicative,
  Alt,
  Plus,
  Alternative,
  Chain,
  Monad,
  Bifunctor
}

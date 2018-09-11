/**
 * aliases map
 */
const aliases = {
  equals: {
    'fantasy-land/equals'(that) {
      return this.equals(that);
    }
  },

  concat: {
    'fantasy-land/concat'(that) {
      return this.concat(that);
    }
  },

  empty: {
    'fantasy-land/empty'() {
      return this.empty();
    }
  },

  map: {
    'fantasy-land/map'(fn) {
      return this.map(fn);
    }
  },

  apply: {
    ap(that) {
      return this.apply(that);
    },

    'fantasy-land/ap'(that) {
      return that.apply(this);
    }
  },

  of: {
    'fantasy-land/of'(value) {
      return this.of(value);
    }
  },

  or: {
    alt(value) {
      return this.or(value);
    },

    'fantasy-land/alt'(value) {
      return this.or(value);
    }
  },

  reduce: {
    'fantasy-land/reduce'(combinator, initial) {
      return this.reduce(combinator, initial);
    }
  },

  traverse: {
    'fantasy-land/traverse'(transformation, lift) {
      return this.traverse(transformation, lift);
    }
  },

  chain: {
    'fantasy-land/chain'(transform) {
      return this.chain(transform);
    }
  },

  chainRec: {
    'fantasy-land/chainRec'(step, initial) {
      return this.chainRec(step, initial);
    }
  },

  extend: {
    'fantasy-land/extend'(transform) {
      return this.extend(transform);
    }
  },

  extract: {
    'fantasy-land/extract'() {
      return this.extract();
    }
  },

  bimap: {
    'fantasy-land/bimap'(f, g) {
      return this.bimap(f, g);
    }
  },

  promap: {
    'fantasy-land/promap'(f, g) {
      return this.propmap(f, g);
    }
  }
};

/**
 * @param {Object} structure
 * @returns {void}
 */
export function defineAliases(structure) {
  Object.keys(aliases).forEach(method => {
    if (typeof structure[method] === 'function') {
      Object.keys(aliases[method]).forEach(alias => {
        structure[alias] = aliases[method][alias];
      });
    }
  });
}

/**
 * foldr array
 *
 * @param {Array} xs Array to fold
 * @param {Any} init Initial value
 * @param {Function}
 */
export function foldrArr(xs, init, f) {
  let acc = init;
  let len = xs.length;
  for (let i = len - 1; i >= 0; i--) {
    acc = f(xs[i], acc);
  }
  return acc;
}

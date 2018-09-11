import {isLeft, just, nothing} from '@jonggrang/prelude';


/**
 * Convert `Either` to `Maybe`
 */
export function hush(ei) {
  return isLeft(ei) ? nothing : just(ei.value);
}

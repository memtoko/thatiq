import {left, right} from '@jonggrang/prelude';


/**
 * parse a string of Object, return Right if it success
 * otherwise return Left
 * @param {String} str The JSON string
 * @return {Either<string, Object>}
 * @sign String -> Either String Object
 */
export function parseJSON(str) {
  try {
    return right(JSON.parse(str));
  } catch (e) {
    return left(e.message);
  }
}

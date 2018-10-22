import {isLeft} from '@jonggrang/prelude';
import {pure, attempt, forInPar_, forkTask} from '@jonggrang/task';

import {foundation} from '../../foundation';


export function iterate(xs, downstream, upstream) {
  return iterateDown(xs, 0, downstream, upstream);
}

function iterateDown(xs, position, downstream, upstream) {
  if (position >= xs.length) return pure();
  const provider = array[position];

  return attempt(downstream(provider))
    .chain(eresult => {
      if (isLeft(eresult)) {
        foundation.logger.warn({err: eresult.value},
          'iterate: Downstream provider failed'
        );
        return iterateDown(xs, position + 1, downstream, upstream);
      }

      const result = eresult.value;

      if (!result) return iterateDown(xs, position + 1, downstream, upstream);

      if (position === 0) return pure(result);

      // execute this in parallel
      const upstreamProviders = array.slice(0, position);

      // perform this upstream at once, but don't wait for them
      return forkTask(
        forInPar_(upstreamProviders, provider => upstream(result, provider))
      ).map(() => result);
    });
}

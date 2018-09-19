import {runTask} from '@jonggrang/task';

// type HandlerM :: (req, res, next) -> Task a

/**
 * @sig HandlerM -> (req, res, next) -> void
 */
export function as(handler) {
  return function handlerM(req, res, next) {
    runTask(handler(req, res, next), (err) => {
      if (err) return next(err);
    });
  };
}

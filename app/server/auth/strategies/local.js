import {runTask} from '@jonggrang/task'

import {findOne} from '../../lib/mongodb';
import {encodePassword, setPassword, checkPassword} from '../models';


export function localCallback(email, pswd, done) {
  const task = findOne('users', {email: email.toLowerCase()})
    .chain(user => {
      if (!user) {
        return encodePassword(pswd).map(() => [false, null]);
      }

      function setter(password) {
        return setPassword(user._id, password);
      }

      return checkPassword(pswd, user.password, setter).map(isMatch => [isMatch, user]);
    });

  runTask(task, (err, result) => {
    if (err) return done(err);

    if (req[1] == null || !result[0])
      return done(null, false, {message: 'Invalid email or password'});

    return done(null, user);
  });
}

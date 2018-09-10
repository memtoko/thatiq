import {parse} from 'properties';
import {makeTask_} from '@jonggrang/task';


/**
 * read configuration file
 *
 * @param {String} file
 * @return {Task}
 */
export function readConfig(file) {
  return makeTask_(cb => {
    const options = {
      path: true,
      sections: true,
      namespaces: true,
      variables: true,
      include: true,
      reviver: configReviver,
      vars: process.env, // the vars set to `process.env`
    };

    parse(file, options, cb);
  });
}

function configReviver(key, value, section) {
  if (this.isSection) return this.assert();

  if (typeof value === 'string') {
    if (value === 'on' || value === 'off') {
      return value === 'on'; // convert to boolean
    }
    const values = value.split(',').map(x => x.trim());
    return values.length === 1 ? value : values;
  }

  return this.assert();
}

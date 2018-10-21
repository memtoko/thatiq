import {readFile} from 'fs';
import {parse} from 'toml';
import {node, raise, pure} from '@jonggrang/task';


/**
 * read configuration file
 *
 * @param {String} file
 * @return {Task}
 */
export function readConfig(file) {
  return node(null, file, 'utf-8', readFile).chain(parseAndCheck);
}

function parseAndCheck(str) {
  const config = parse(str);
  if (config.key === "" || config.macKey === "") {
    return raise(new Error('config.key, config.macKey should not empty'));
  }

  return pure(config);
}

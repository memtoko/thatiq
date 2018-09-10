import {readFile} from 'fs';
import {resolve} from 'path';

import {liftEff, node as fromNodeBack} from '@jonggrang/task';


/**
 * Load dot env file, set it to process.env and return it
 *
 * @param {Object} opts Object options
 * @property {String} opts.path Path to .env file
 * @property {String} opts.encoding encoding of file
 * @returns {Task}
 */
export function loadDotenv(opts) {
  let dotenvPath = resolve(process.cwd(), '.env');
  let encoding = 'utf8';
  // override the default value if set
  if (opts != null) {
    if (opts.path) dotenvPath = opts.path;

    if (opts.encoding) encoding = opts.encoding;
  }

  return fromNodeBack(null, dotenvPath, encoding, readDotenv)
    .chain(setProcessEnv)
}

function setProcessEnv(p) {
  return liftEff(null, p, _setProcessEnv);
}

function _setProcessEnv(parsed) {
  Object.keys(parsed).forEach(key => {
    if (!process.env.hasOwnProperty(key)) {
      process.env[key] = parsed[key];
    }
  });
  return parsed;
}

function readDotenv(path, encoding, cb) {
  readFile(path, { encoding }, (err, data) => {
    if (err) return cb(err);

    cb(null, parse(data));
  });
}

const KEY_VAL_RE = /^\s*([\w\.\-]+)\s*=\s*(.*)?\s*$/;

/**
 *
 * @param {String} src Source of dotenv
 * @returns {Object}
 */
function parse(src) {
  let ret = {};
  const lines = src.split('\n');
  let line;
  for (let i = 0, len = lines.length; i < len; i++) {
    line = lines[i];

    const keyValueArr = line.match(KEY_VAL_RE);
    if (keyValueArr != null) {
      const key = keyValueArr[1];

      // default undefined or missing values to empty string
      let value = keyValueArr[2] || '';

      // expand newlines in quoted values
      const len = value ? value.length : 0;
      if (len > 0 && value.charAt(0) === '"' && value.charAt(len - 1) === '"') {
        value = value.replace(/\\n/gm, '\n');
      }

      // remove any surrounding quotes and extra spaces
      value = value.replace(/(^['"]|['"]$)/g, '').trim();

      ret[key] = value;
    }
  }

  return ret;
}

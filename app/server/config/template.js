import {readFile} from 'fs';
import {join} from 'path';
import * as nunjucks from 'nunjucks';


/**
 * svg inline
 */
export class SVGInlineExt {
  constructor(staticSettings) {
    staticSettings = staticSettings || {};
    this.staticRoot = staticSettings.root;
    this.staticPath = staticSettings.path;
    this.tags = ['svg_inline'];
  }

  parse(parser, nodes) {
    const tok = parser.nextToken();
    var args = parser.parseSignature(null, true);
    parser.advanceAfterBlockEnd(tok.value);

    return new nodes.CallExtensionAsync(this, 'run', args);
  }

  run(_, path, cb) {
    const fullPath = join(this.staticRoot, this.staticPath, path);

    readFile(fullPath, { encoding: 'utf8' }, (err, data) => {
      if (err) return cb(err);

      cb(null, new nunjucks.runtime.SafeString(data));
    });
  }
}

import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import json from 'rollup-plugin-json';
import resolve from 'rollup-plugin-node-resolve';


export default [
  {
    input: 'app/server/index.js',
    plugins: [
      babel({ exclude: 'node_modules/**' }),
      json(),
      resolve(),
      commonjs()
    ],
    external: [
      'assert', 'crypto', 'fs', 'path', 'events', 'mongodb', 'http', 'mime',
      'url', 'punycode', 'stream', 'readable-stream', 'ioredis', 'os', 'domain',
      'vm', 'net', 'util', 'pino', 'nunjucks', 'request', 'string_decoder', 'ioredis',
      'redis-parser', 'redis-commands', 'redis-errors', 'redis', 'oauth2orize'
    ],
    output: [
      { file: 'dist/server/index.js', format: 'cjs', sourcemap: true }
    ]
  }
]

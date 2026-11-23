import * as esbuild from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const wasm = path.join(here, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');

await esbuild.build({
  entryPoints: [path.join(here, 'entry.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: path.join(here, 'out.cjs'),
  external: ['sql.js'],
  logLevel: 'warning',
  plugins: [
    {
      name: 'stubs',
      setup(build) {
        build.onResolve({ filter: /\?url$/ }, () => ({ path: wasm, namespace: 'wasm-url' }));
        build.onLoad({ filter: /.*/, namespace: 'wasm-url' }, () => ({ contents: `export default ${JSON.stringify(wasm)}`, loader: 'js' }));
        build.onResolve({ filter: /\/persistence$/ }, () => ({ path: path.join(here, 'persistenceStub.ts') }));
      },
    },
  ],
});

import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  // Off on purpose: the maps were about 60% of every published tarball, and a
  // consumer debugging a release reads the source at its tag, not in node_modules.
  sourcemap: false,
  treeshake: true,
  // Neutral, so nothing Node-only sneaks into the handler path: the source
  // imports no `node:*` module, and the bundle must run on Bun, Deno and
  // workers too. `test/runtime.test.ts` holds the source to that.
  target: 'es2022',
  platform: 'neutral',
})

import { defineConfig } from 'tsup'

export default defineConfig({
  // The conformance suite is its own entry, so the client never ships it.
  entry: { index: 'src/index.ts', 'conformance/index': 'src/conformance/index.ts' },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  // Off on purpose: the maps were about 60% of every published tarball, and a
  // consumer debugging a release reads the source at its tag, not in node_modules.
  sourcemap: false,
  treeshake: true,
  target: 'es2022',
  // Neutral, not node: this package has to bundle for a browser too.
  platform: 'neutral',
})

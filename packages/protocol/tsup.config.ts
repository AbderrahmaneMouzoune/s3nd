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
  target: 'es2022',
  // Neutral, not node: this package has to bundle for a browser too.
  platform: 'neutral',
  // nanoid is ESM-only; bundling it keeps the CommonJS build usable.
  noExternal: ['nanoid'],
})

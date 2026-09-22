import { readFileSync } from 'node:fs'

import { defineConfig } from 'tsup'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

export default defineConfig({
  entry: ['src/index.ts'],
  // A binary is executed, never imported: one ESM build is all it needs.
  format: ['esm'],
  dts: false,
  clean: true,
  // Off on purpose: the maps were about 60% of every published tarball, and a
  // consumer debugging a release reads the source at its tag, not in node_modules.
  sourcemap: false,
  target: 'node20',
  platform: 'node',
  define: {
    __VERSION__: JSON.stringify(version),
  },
})

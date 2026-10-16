import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // Every source file, not only those a test happened to import: an
      // untested module has to count against the total.
      include: ['src/**/*.ts'],
      reporter: ['text-summary', 'lcov'],
      // The coverage measured when the gate went in, rounded down. Raise them
      // when the suite grows; a pull request that lowers one has to say why.
      thresholds: {
        statements: 86,
        branches: 78,
        functions: 92,
        lines: 89,
      },
    },
  },
})

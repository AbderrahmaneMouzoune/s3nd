import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      // Every source file, not only those a test happened to import: an
      // untested module has to count against the total.
      include: ['src/**/*.ts'],
      reporter: ['text-summary', 'lcov'],
      // The coverage measured when the gate went in, rounded down. Raise them
      // when the suite grows; a pull request that lowers one has to say why.
      thresholds: {
        statements: 93,
        branches: 89,
        functions: 96,
        lines: 95,
      },
    },
    projects: [
      {
        // The default: offline, in-memory, no credentials. What `bun run test` runs.
        extends: true,
        test: {
          name: 'unit',
          include: ['test/**/*.test.ts'],
          exclude: ['test/integration/**'],
        },
      },
      {
        // Against a real S3-compatible server; see test/integration.
        extends: true,
        test: {
          name: 'integration',
          include: ['test/integration/**/*.integration.test.ts'],
          testTimeout: 30_000,
          hookTimeout: 30_000,
        },
      },
    ],
  },
})

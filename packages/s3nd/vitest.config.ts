import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
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

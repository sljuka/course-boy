import { defineConfig } from 'vitest/config'

// Separate from the default `npm test` run on purpose: these tests launch a real
// Electron binary and take tens of seconds. The default vitest include pattern only
// matches *.test.* / *.spec.*, so the `*.e2e.mjs` naming keeps them out of `npm test`
// without needing an exclude list.
export default defineConfig({
  test: {
    include: ['e2e/**/*.e2e.mjs'],
    environment: 'node',
    testTimeout: 120_000,
    hookTimeout: 120_000,
    // One app instance shared across an ordered file — never run files in parallel.
    fileParallelism: false,
    pool: 'forks',
  },
})

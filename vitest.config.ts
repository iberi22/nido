import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [svelte({ hot: false })],
  resolve: {
    conditions: ['browser'],
    alias: {
      // Wave 5 #84 — main.ts lazily imports the build-time virtual module;
      // vitest resolves it to a stub (production builds use the real plugin).
      'virtual:pwa-register': fileURLToPath(new URL('./test/stubs/pwa-register-stub.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['test/unit/**/*.test.ts', 'test/integration/**/*.test.ts'],
    globals: false,
    testTimeout: 10000,
    environmentOptions: {
      jsdom: { url: 'http://localhost/' },
    },
    coverage: {
      provider: 'v8',
      include: ['src/lib/domain/**'],
      reportsDirectory: 'test/coverage',
      // Code coverage gate requirements
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
      },
    },
  },
})

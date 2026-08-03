import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte({ hot: false })],
  resolve: {
    conditions: ['browser'],
  },
  test: {
    environment: 'jsdom',
    include: ['test/unit/**/*.test.ts', 'test/integration/**/*.test.ts'],
    globals: false,
    testTimeout: 10000,
    environmentOptions: {
      jsdom: { url: 'http://localhost/' },
    },
  },
})

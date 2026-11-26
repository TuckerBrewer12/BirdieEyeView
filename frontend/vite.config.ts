import { defineConfig } from 'vitest/config'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import istanbul from 'vite-plugin-istanbul'
import path from 'path'

const collectCoverage = process.env.VITE_COVERAGE === 'true'

function dropBrandHarnessFromBuilds(): Plugin {
  const app = path.resolve(__dirname, 'src/App.tsx')
  const stub = '\0brand-harness-stub'
  let replaced = false
  return {
    name: 'drop-brand-harness-from-builds',
    apply: 'build',
    enforce: 'pre',
    resolveId(source, importer) {
      if (source !== './brand/BrandHarness' || importer !== app) return null
      replaced = true
      return stub
    },
    load(id) {
      return id === stub ? 'export function BrandHarness() { return null }' : null
    },
    buildEnd(error) {
      if (!error && !replaced) this.error('App.tsx no longer imports ./brand/BrandHarness; update this plugin')
    },
  }
}

// Unit tests run in a US timezone, where UTC midnight is the evening before, so a
// date-only string read as UTC shows up as the wrong day instead of passing on a
// UTC machine. Set before Vitest starts its workers, which inherit it.
if (process.env.VITEST) process.env.TZ = 'America/Los_Angeles'

export default defineConfig({
  plugins: [
    dropBrandHarnessFromBuilds(),
    react(),
    tailwindcss(),
    ...(collectCoverage
      ? [
          istanbul({
            include: 'src/**/*',
            exclude: [
              'node_modules/**',
              'src/testing/**',
              'src/**/tests/**',
              'src/**/previews/**',
              'src/**/*.test.*',
              'src/**/*.spec.*',
              'src/**/*.robot.ts',
              'src/**/*Test.*',
            ],
            extension: ['.ts', '.tsx'],
            requireEnv: true,
            checkProd: true,
          }),
        ]
      : []),
  ],
  ...(collectCoverage ? { build: { sourcemap: true } } : {}),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'src/**/*Test.{ts,tsx}', 'eslint/**/*.test.js', 'server/**/*.test.js', 'scripts/**/*.test.js'],
    exclude: ['src/**/*.screenshot.spec.ts', 'src/**/*.ui.spec.ts', 'src/**/*.capture.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['json', 'text'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/**/*Test.{ts,tsx}',
        'src/**/*.screenshot.spec.ts',
        'src/**/*.ui.spec.ts',
        'src/**/*.capture.spec.ts',
        'src/**/*.robot.ts',
        'src/**/tests/**',
        'src/testing/**',
        'src/brand/previews/**',
        'src/pages/**/previews/**',
        'src/brand/tests/**',
      ],
    },
  },
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        timeout: 600000,
        proxyTimeout: 600000,
      },
    },
  },
})

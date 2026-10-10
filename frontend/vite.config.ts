import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import istanbul from 'vite-plugin-istanbul'
import path from 'path'

const collectCoverage = process.env.VITE_COVERAGE === 'true'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Only the Espresso coverage run sets VITE_COVERAGE. A normal dev server
    // and the Vitest run stay uninstrumented.
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
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'src/**/*Test.{ts,tsx}', 'eslint/**/*.test.js'],
    exclude: ['src/**/*.screenshot.spec.ts', 'src/**/*.espresso.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['json', 'text'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/**/*Test.{ts,tsx}',
        'src/**/*.screenshot.spec.ts',
        'src/**/*.espresso.spec.ts',
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

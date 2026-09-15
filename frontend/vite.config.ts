import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'src/**/*Test.{ts,tsx}'],
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

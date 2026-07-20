import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'dist/**'],
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        branches: 60,
        functions: 70,
        lines: 80,
        statements: 80
      }
    }
  }
})

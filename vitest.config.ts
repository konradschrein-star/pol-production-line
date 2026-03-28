import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import dotenv from 'dotenv';

// Load test environment variables BEFORE any test code runs
dotenv.config({ path: path.resolve(__dirname, '.env.test') });

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom', // Changed from 'node' for React components
    setupFiles: ['./tests/setup.ts', './tests/setup-react.ts'],
    include: ['tests/**/*.{test,spec}.{ts,tsx}'], // Include .tsx files
    exclude: ['node_modules', 'dist', '.next'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '*.config.ts',
        'scripts/',
        'electron/',
        'remotion/',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 65,
        statements: 70,
        autoUpdate: false, // CRITICAL: Don't auto-lower thresholds
        perFile: false, // Check overall coverage, not per-file
      },
    },
    testTimeout: 30000, // 30s for integration tests
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

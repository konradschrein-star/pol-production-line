/**
 * Vitest Setup File
 *
 * Global setup for all tests.
 * Runs before each test file.
 */

import dotenv from 'dotenv';
import path from 'path';
import { pool } from '@/lib/db';
import { beforeAll, afterAll } from 'vitest';

// CRITICAL: Load test environment variables BEFORE anything else
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

// Fallback to main .env if .env.test doesn't exist
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Override DATABASE_URL for tests (ensures test database is used)
process.env.DATABASE_URL = 'postgresql://obsidian:obsidian_password@localhost:5432/obsidian_news_test';
process.env.REDIS_URL = 'redis://localhost:6379/1';
process.env.NODE_ENV = 'test';

// Global test utilities
global.testTimeout = 30000; // 30 seconds default

// Verify test database connection
beforeAll(async () => {
  // 1. Check database connection
  try {
    await pool.query('SELECT 1');
    console.log('✓ Test database connected');
  } catch (err) {
    console.error('✗ Test database connection failed:', err);
    throw new Error(
      'Test database not available. Run: createdb obsidian_news_test && npm run init-db'
    );
  }

  // 2. Check Next.js server availability (for integration tests)
  try {
    const response = await fetch('http://localhost:8347/api/health', {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }
    console.log('✓ Next.js server connected');
  } catch (err: any) {
    if (err.name === 'AbortError' || err.code === 'ECONNREFUSED') {
      throw new Error(
        'Next.js server not available. Run: npm run dev (in separate terminal)'
      );
    }
    // Non-critical error (health endpoint may not exist yet)
    console.warn('⚠ Next.js server check failed (may not be critical):', err.message);
  }
});

afterAll(async () => {
  // Clean up orphaned test data (from crashed/interrupted tests)
  try {
    const result = await pool.query(`
      DELETE FROM news_jobs
      WHERE raw_script LIKE '%test%' OR raw_script LIKE '%Test%'
    `);
    if (result.rowCount && result.rowCount > 0) {
      console.log(`✓ Cleaned up ${result.rowCount} orphaned test jobs`);
    }
  } catch (err) {
    console.warn('⚠ Failed to clean up orphaned test data:', err);
  }

  await pool.end();
});

// Suppress console during tests (comment out for debugging)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
// };

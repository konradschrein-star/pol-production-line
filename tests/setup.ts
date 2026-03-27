/**
 * Vitest Setup File
 *
 * Global setup for all tests.
 * Runs before each test file.
 */

import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

// Fallback to main .env if .env.test doesn't exist
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Global test utilities
global.testTimeout = 30000; // 30 seconds default

// Suppress console during tests (comment out for debugging)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
// };

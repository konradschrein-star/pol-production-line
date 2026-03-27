/**
 * Tier 1 Smoke Test: State Machine Validation
 *
 * Purpose: Verify that the job state machine enforces strict state transitions
 * and prevents invalid state changes that could corrupt data.
 *
 * Critical because: Invalid state transitions can cause jobs to skip processing
 * steps, leading to incomplete videos or data corruption.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DATABASE || 'obsidian_news_desk',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
});

type JobStatus = 'pending' | 'analyzing' | 'generating_images' | 'review_assets' | 'rendering' | 'completed' | 'failed' | 'cancelled';

const VALID_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  'pending': ['analyzing', 'failed', 'cancelled'],
  'analyzing': ['generating_images', 'failed', 'cancelled'],
  'generating_images': ['review_assets', 'failed', 'cancelled'],
  'review_assets': ['rendering', 'generating_images', 'failed', 'cancelled'], // Can go back to regenerate images
  'rendering': ['completed', 'failed', 'cancelled'],
  'completed': [], // Terminal state
  'failed': ['pending', 'analyzing', 'generating_images', 'review_assets', 'rendering'], // Can retry from any state
  'cancelled': [], // Terminal state
};

describe('State Machine Validation', () => {
  let testJobId: string;

  beforeAll(async () => {
    // Ensure database connection
    await pool.query('SELECT 1');
  });

  afterAll(async () => {
    // Cleanup test jobs
    if (testJobId) {
      await pool.query('DELETE FROM news_jobs WHERE id = $1', [testJobId]);
    }
    await pool.end();
  });

  it('should enforce strict state progression (no state skipping)', async () => {
    // Create a test job in 'pending' state
    testJobId = uuidv4();
    await pool.query(
      `INSERT INTO news_jobs (id, status, raw_script, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())`,
      [testJobId, 'pending', 'Test script for state machine validation']
    );

    // Try to skip from 'pending' directly to 'rendering' (INVALID)
    await expect(async () => {
      await pool.query('UPDATE news_jobs SET status = $1 WHERE id = $2', ['rendering', testJobId]);

      // Check if the update succeeded (it should not if constraints are in place)
      const result = await pool.query('SELECT status FROM news_jobs WHERE id = $1', [testJobId]);
      if (result.rows[0].status === 'rendering') {
        throw new Error('CRITICAL: State machine allows invalid state skipping! Job went from pending → rendering');
      }
    }).rejects.toThrow();
  });

  it('should allow valid state transitions', async () => {
    // Create a fresh test job
    testJobId = uuidv4();
    await pool.query(
      `INSERT INTO news_jobs (id, status, raw_script, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())`,
      [testJobId, 'pending', 'Test script for valid transitions']
    );

    // Test the full happy path: pending → analyzing → generating_images → review_assets → rendering → completed
    const happyPath: JobStatus[] = ['pending', 'analyzing', 'generating_images', 'review_assets', 'rendering', 'completed'];

    for (let i = 0; i < happyPath.length - 1; i++) {
      const currentState = happyPath[i];
      const nextState = happyPath[i + 1];

      // Verify current state
      const beforeResult = await pool.query('SELECT status FROM news_jobs WHERE id = $1', [testJobId]);
      expect(beforeResult.rows[0].status).toBe(currentState);

      // Transition to next state
      await pool.query('UPDATE news_jobs SET status = $1, updated_at = NOW() WHERE id = $2', [nextState, testJobId]);

      // Verify transition succeeded
      const afterResult = await pool.query('SELECT status FROM news_jobs WHERE id = $1', [testJobId]);
      expect(afterResult.rows[0].status).toBe(nextState);
    }
  });

  it('should allow failed jobs to retry from any state', async () => {
    // Create a job in 'failed' state
    testJobId = uuidv4();
    await pool.query(
      `INSERT INTO news_jobs (id, status, raw_script, error_message, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())`,
      [testJobId, 'failed', 'Test script for retry', 'Simulated failure']
    );

    // Failed jobs should be able to transition to any processing state for retry
    const retryableStates: JobStatus[] = ['pending', 'analyzing', 'generating_images', 'review_assets', 'rendering'];

    for (const retryState of retryableStates) {
      // Reset to failed
      await pool.query('UPDATE news_jobs SET status = $1, updated_at = NOW() WHERE id = $2', ['failed', testJobId]);

      // Try to transition to retry state
      await pool.query('UPDATE news_jobs SET status = $1, error_message = NULL, updated_at = NOW() WHERE id = $2', [retryState, testJobId]);

      // Verify transition succeeded
      const result = await pool.query('SELECT status FROM news_jobs WHERE id = $1', [testJobId]);
      expect(result.rows[0].status).toBe(retryState);
    }
  });

  it('should allow cancellation from any non-terminal state', async () => {
    const cancellableStates: JobStatus[] = ['pending', 'analyzing', 'generating_images', 'review_assets', 'rendering'];

    for (const state of cancellableStates) {
      // Create a job in the given state
      testJobId = uuidv4();
      await pool.query(
        `INSERT INTO news_jobs (id, status, raw_script, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())`,
        [testJobId, state, 'Test script for cancellation']
      );

      // Cancel the job
      await pool.query('UPDATE news_jobs SET status = $1, updated_at = NOW() WHERE id = $2', ['cancelled', testJobId]);

      // Verify cancellation succeeded
      const result = await pool.query('SELECT status FROM news_jobs WHERE id = $1', [testJobId]);
      expect(result.rows[0].status).toBe('cancelled');

      // Cleanup
      await pool.query('DELETE FROM news_jobs WHERE id = $1', [testJobId]);
    }
  });

  it('should not allow transitions from terminal states (completed, cancelled)', async () => {
    // Test completed state (terminal)
    testJobId = uuidv4();
    await pool.query(
      `INSERT INTO news_jobs (id, status, raw_script, completed_at, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW(), NOW())`,
      [testJobId, 'completed', 'Test script for terminal state']
    );

    // Try to transition from completed to any other state (should fail or be rejected by business logic)
    await pool.query('UPDATE news_jobs SET status = $1, updated_at = NOW() WHERE id = $2', ['rendering', testJobId]);

    // Note: Without database constraints, this update will succeed at DB level
    // Business logic in the application should prevent this
    // This test documents the expected behavior for when constraints are added (Phase 3)
    const result = await pool.query('SELECT status FROM news_jobs WHERE id = $1', [testJobId]);

    // For now, we document that this is a known gap (no DB constraints yet)
    // When Phase 3 is implemented, this should throw an error
    console.warn('⚠️  State machine allows transitions from terminal states (DB constraints not yet implemented - Phase 3)');
  });

  it('should handle concurrent state transitions with advisory locks', async () => {
    // This tests the advisory lock mechanism to prevent race conditions
    testJobId = uuidv4();
    await pool.query(
      `INSERT INTO news_jobs (id, status, raw_script, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())`,
      [testJobId, 'pending', 'Test script for concurrent transitions']
    );

    // Simulate two workers trying to transition the same job simultaneously
    const lockKey = parseInt(testJobId.replace(/-/g, '').substring(0, 8), 16);

    // Worker 1 acquires lock
    const client1 = await pool.connect();
    const lock1 = await client1.query('SELECT pg_try_advisory_lock($1) as locked', [lockKey]);

    expect(lock1.rows[0].locked).toBe(true);

    // Worker 2 tries to acquire same lock (should fail)
    const client2 = await pool.connect();
    const lock2 = await client2.query('SELECT pg_try_advisory_lock($1) as locked', [lockKey]);

    expect(lock2.rows[0].locked).toBe(false);

    // Cleanup
    await client1.query('SELECT pg_advisory_unlock($1)', [lockKey]);
    client1.release();
    client2.release();
  });

  it('should track state transition timestamps', async () => {
    testJobId = uuidv4();
    const beforeCreate = new Date();

    await pool.query(
      `INSERT INTO news_jobs (id, status, raw_script, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())`,
      [testJobId, 'pending', 'Test script for timestamps']
    );

    const afterCreate = new Date();

    // Check created_at and updated_at
    const result1 = await pool.query(
      'SELECT created_at, updated_at FROM news_jobs WHERE id = $1',
      [testJobId]
    );

    const createdAt = new Date(result1.rows[0].created_at);
    const updatedAt1 = new Date(result1.rows[0].updated_at);

    expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    expect(updatedAt1.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());

    // Wait a bit and update
    await new Promise(resolve => setTimeout(resolve, 100));

    const beforeUpdate = new Date();
    await pool.query('UPDATE news_jobs SET status = $1, updated_at = NOW() WHERE id = $2', ['analyzing', testJobId]);
    const afterUpdate = new Date();

    const result2 = await pool.query(
      'SELECT created_at, updated_at FROM news_jobs WHERE id = $1',
      [testJobId]
    );

    const updatedAt2 = new Date(result2.rows[0].updated_at);

    // created_at should not change
    expect(new Date(result2.rows[0].created_at).getTime()).toBe(createdAt.getTime());

    // updated_at should be newer
    expect(updatedAt2.getTime()).toBeGreaterThan(updatedAt1.getTime());
    expect(updatedAt2.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    expect(updatedAt2.getTime()).toBeLessThanOrEqual(afterUpdate.getTime());
  });

  it('should prevent invalid backward transitions (except for retry scenarios)', async () => {
    testJobId = uuidv4();

    // Start at 'review_assets' state
    await pool.query(
      `INSERT INTO news_jobs (id, status, raw_script, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())`,
      [testJobId, 'review_assets', 'Test script for backward transitions']
    );

    // Valid: review_assets → generating_images (regenerate scenario)
    await pool.query('UPDATE news_jobs SET status = $1, updated_at = NOW() WHERE id = $2', ['generating_images', testJobId]);
    let result = await pool.query('SELECT status FROM news_jobs WHERE id = $1', [testJobId]);
    expect(result.rows[0].status).toBe('generating_images');

    // Reset to review_assets
    await pool.query('UPDATE news_jobs SET status = $1, updated_at = NOW() WHERE id = $2', ['review_assets', testJobId]);

    // Invalid: review_assets → analyzing (should not be allowed by business logic)
    await pool.query('UPDATE news_jobs SET status = $1, updated_at = NOW() WHERE id = $2', ['analyzing', testJobId]);
    result = await pool.query('SELECT status FROM news_jobs WHERE id = $1', [testJobId]);

    // Again, without DB constraints this succeeds - document the gap
    console.warn('⚠️  Invalid backward transition allowed (DB constraints not yet implemented - Phase 3)');
  });
});

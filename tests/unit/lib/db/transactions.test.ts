/**
 * Database Transactions Test Suite
 *
 * Tests the critical transaction layer that prevents race conditions
 * in the BullMQ worker pipeline.
 *
 * Priority: MOST CRITICAL
 * Coverage Target: 95%+
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { pool } from '@/lib/db';
import {
  withTransaction,
  transitionJobState,
  transitionJobStateStandalone,
  transactionalQuery,
  TransactionTimeoutError,
} from '@/lib/db/transactions';
import { PoolClient } from 'pg';

describe('Database Transactions', () => {
  let testJobId: string;

  beforeEach(async () => {
    // Create test job
    const result = await pool.query(
      'INSERT INTO news_jobs (raw_script, status) VALUES ($1, $2) RETURNING id',
      ['test script for transactions', 'pending']
    );
    testJobId = result.rows[0].id;
  });

  afterEach(async () => {
    // Cleanup test data
    await pool.query('DELETE FROM news_jobs WHERE id = $1', [testJobId]);
  });

  describe('withTransaction', () => {
    it('should execute callback within a transaction', async () => {
      const result = await withTransaction(async (client) => {
        await client.query('UPDATE news_jobs SET status = $1 WHERE id = $2', [
          'analyzing',
          testJobId,
        ]);
        return 'success';
      });

      expect(result).toBe('success');

      // Verify changes were committed
      const job = await pool.query('SELECT status FROM news_jobs WHERE id = $1', [testJobId]);
      expect(job.rows[0].status).toBe('analyzing');
    });

    it('should rollback transaction on error', async () => {
      try {
        await withTransaction(async (client) => {
          await client.query('UPDATE news_jobs SET status = $1 WHERE id = $2', [
            'analyzing',
            testJobId,
          ]);
          throw new Error('Simulated error');
        });
        expect.fail('Should have thrown error');
      } catch (err: any) {
        expect(err.message).toBe('Simulated error');
      }

      // Status should remain 'pending' due to rollback
      const job = await pool.query('SELECT status FROM news_jobs WHERE id = $1', [testJobId]);
      expect(job.rows[0].status).toBe('pending');
    });

    it('should rollback on database constraint violation', async () => {
      try {
        await withTransaction(async (client) => {
          // Attempt to insert duplicate ID (should violate primary key constraint)
          await client.query('INSERT INTO news_jobs (id, raw_script, status) VALUES ($1, $2, $3)', [
            testJobId, // Duplicate ID
            'duplicate test',
            'pending',
          ]);
        });
        expect.fail('Should have thrown constraint violation error');
      } catch (err: any) {
        expect(err.code).toBe('23505'); // PostgreSQL unique violation error code
      }

      // Original job should still exist and be unchanged
      const job = await pool.query('SELECT status FROM news_jobs WHERE id = $1', [testJobId]);
      expect(job.rows[0].status).toBe('pending');
    });

    it('should timeout if transaction exceeds timeout', async () => {
      const timeout = 100; // 100ms timeout

      try {
        await withTransaction(
          async (client) => {
            // Simulate long-running operation
            await new Promise((resolve) => setTimeout(resolve, 200));
            await client.query('UPDATE news_jobs SET status = $1 WHERE id = $2', [
              'analyzing',
              testJobId,
            ]);
          },
          timeout
        );
        expect.fail('Should have thrown timeout error');
      } catch (err) {
        expect(err).toBeInstanceOf(TransactionTimeoutError);
        expect((err as TransactionTimeoutError).message).toContain('100ms');
      }

      // Changes should not be committed due to timeout
      const job = await pool.query('SELECT status FROM news_jobs WHERE id = $1', [testJobId]);
      expect(job.rows[0].status).toBe('pending');
    }, 10000);

    it('should allow nested queries within transaction', async () => {
      await withTransaction(async (client) => {
        // Update job
        await client.query('UPDATE news_jobs SET status = $1 WHERE id = $2', [
          'analyzing',
          testJobId,
        ]);

        // Insert scene
        await client.query(
          'INSERT INTO news_scenes (job_id, scene_order, image_prompt, ticker_headline) VALUES ($1, $2, $3, $4)',
          [testJobId, 0, 'test prompt', 'test headline']
        );
      });

      // Verify both operations were committed
      const job = await pool.query('SELECT status FROM news_jobs WHERE id = $1', [testJobId]);
      expect(job.rows[0].status).toBe('analyzing');

      const scenes = await pool.query('SELECT * FROM news_scenes WHERE job_id = $1', [testJobId]);
      expect(scenes.rows.length).toBe(1);

      // Cleanup scene
      await pool.query('DELETE FROM news_scenes WHERE job_id = $1', [testJobId]);
    });

    it('should release client even on error', async () => {
      const initialIdleCount = pool.idleCount;

      try {
        await withTransaction(async (client) => {
          throw new Error('Test error');
        });
      } catch (err) {
        // Expected error
      }

      // Wait a bit for async release
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Pool should have same or more idle connections (client was released)
      expect(pool.idleCount).toBeGreaterThanOrEqual(initialIdleCount);
    });
  });

  describe('transitionJobState', () => {
    it('should transition job state successfully', async () => {
      const success = await withTransaction(async (client) => {
        return transitionJobState(client, testJobId, 'pending', 'analyzing');
      });

      expect(success).toBe(true);

      const job = await pool.query('SELECT status FROM news_jobs WHERE id = $1', [testJobId]);
      expect(job.rows[0].status).toBe('analyzing');
    });

    it('should fail if current status does not match', async () => {
      const success = await withTransaction(async (client) => {
        // Try to transition from 'analyzing' but job is 'pending'
        return transitionJobState(client, testJobId, 'analyzing', 'generating_images');
      });

      expect(success).toBe(false);

      const job = await pool.query('SELECT status FROM news_jobs WHERE id = $1', [testJobId]);
      expect(job.rows[0].status).toBe('pending'); // Unchanged
    });

    it('should prevent race conditions with advisory locks', async () => {
      // Attempt concurrent state transitions
      const transition1 = withTransaction((client) =>
        transitionJobState(client, testJobId, 'pending', 'analyzing')
      );
      const transition2 = withTransaction((client) =>
        transitionJobState(client, testJobId, 'pending', 'analyzing')
      );

      const results = await Promise.all([transition1, transition2]);

      // Only one should succeed
      const successCount = results.filter((r) => r === true).length;
      expect(successCount).toBe(1);

      // Job should be in 'analyzing' state exactly once
      const job = await pool.query('SELECT status FROM news_jobs WHERE id = $1', [testJobId]);
      expect(job.rows[0].status).toBe('analyzing');
    });

    it('should prevent concurrent transitions to different states', async () => {
      // Try to transition to different states concurrently
      const transition1 = withTransaction((client) =>
        transitionJobState(client, testJobId, 'pending', 'analyzing')
      );
      const transition2 = withTransaction((client) =>
        transitionJobState(client, testJobId, 'pending', 'failed')
      );

      const results = await Promise.all([transition1, transition2]);

      // Only one should succeed
      const successCount = results.filter((r) => r === true).length;
      expect(successCount).toBe(1);

      // Job should be in one of the states (not pending)
      const job = await pool.query('SELECT status FROM news_jobs WHERE id = $1', [testJobId]);
      expect(['analyzing', 'failed']).toContain(job.rows[0].status);
    });

    it('should update updated_at timestamp', async () => {
      const initialJob = await pool.query(
        'SELECT updated_at FROM news_jobs WHERE id = $1',
        [testJobId]
      );
      const initialTimestamp = initialJob.rows[0].updated_at;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 100));

      await withTransaction(async (client) => {
        return transitionJobState(client, testJobId, 'pending', 'analyzing');
      });

      const updatedJob = await pool.query(
        'SELECT updated_at FROM news_jobs WHERE id = $1',
        [testJobId]
      );
      const updatedTimestamp = updatedJob.rows[0].updated_at;

      expect(new Date(updatedTimestamp).getTime()).toBeGreaterThan(
        new Date(initialTimestamp).getTime()
      );
    });

    it('should handle multiple sequential transitions', async () => {
      // pending → analyzing
      const success1 = await withTransaction((client) =>
        transitionJobState(client, testJobId, 'pending', 'analyzing')
      );
      expect(success1).toBe(true);

      // analyzing → generating_images
      const success2 = await withTransaction((client) =>
        transitionJobState(client, testJobId, 'analyzing', 'generating_images')
      );
      expect(success2).toBe(true);

      // generating_images → review_assets
      const success3 = await withTransaction((client) =>
        transitionJobState(client, testJobId, 'generating_images', 'review_assets')
      );
      expect(success3).toBe(true);

      const job = await pool.query('SELECT status FROM news_jobs WHERE id = $1', [testJobId]);
      expect(job.rows[0].status).toBe('review_assets');
    });
  });

  describe('transitionJobStateStandalone', () => {
    it('should transition state outside of explicit transaction', async () => {
      const success = await transitionJobStateStandalone(testJobId, 'pending', 'analyzing');

      expect(success).toBe(true);

      const job = await pool.query('SELECT status FROM news_jobs WHERE id = $1', [testJobId]);
      expect(job.rows[0].status).toBe('analyzing');
    });

    it('should fail gracefully on wrong state', async () => {
      const success = await transitionJobStateStandalone(
        testJobId,
        'analyzing',
        'generating_images'
      );

      expect(success).toBe(false);

      const job = await pool.query('SELECT status FROM news_jobs WHERE id = $1', [testJobId]);
      expect(job.rows[0].status).toBe('pending');
    });

    it('should handle non-existent job ID', async () => {
      const fakeJobId = '00000000-0000-0000-0000-000000000000';
      const success = await transitionJobStateStandalone(fakeJobId, 'pending', 'analyzing');

      expect(success).toBe(false);
    });
  });

  describe('transactionalQuery', () => {
    it('should execute query within transaction', async () => {
      const rows = await transactionalQuery<{ status: string }>(
        'SELECT status FROM news_jobs WHERE id = $1',
        [testJobId]
      );

      expect(rows.length).toBe(1);
      expect(rows[0].status).toBe('pending');
    });

    it('should commit changes', async () => {
      await transactionalQuery(
        'UPDATE news_jobs SET status = $1 WHERE id = $2',
        ['analyzing', testJobId]
      );

      const job = await pool.query('SELECT status FROM news_jobs WHERE id = $1', [testJobId]);
      expect(job.rows[0].status).toBe('analyzing');
    });

    it('should rollback on error', async () => {
      try {
        await transactionalQuery(
          'UPDATE news_jobs SET status = $1 WHERE id = $2; SELECT invalid_column FROM nonexistent_table',
          ['analyzing', testJobId]
        );
        expect.fail('Should have thrown error');
      } catch (err) {
        // Expected error
      }

      // Status should remain 'pending' due to rollback
      const job = await pool.query('SELECT status FROM news_jobs WHERE id = $1', [testJobId]);
      expect(job.rows[0].status).toBe('pending');
    });

    it('should return empty array for queries with no results', async () => {
      const rows = await transactionalQuery<{ id: string }>(
        'SELECT * FROM news_jobs WHERE id = $1',
        ['00000000-0000-0000-0000-000000000000']
      );

      expect(rows).toEqual([]);
    });
  });

  describe('TransactionTimeoutError', () => {
    it('should create error with correct message', () => {
      const error = new TransactionTimeoutError(5000);

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('TransactionTimeoutError');
      expect(error.message).toBe('Transaction exceeded timeout of 5000ms');
    });
  });

  describe('Edge Cases', () => {
    it('should handle extremely large transaction payload', async () => {
      const largeScript = 'x'.repeat(1000000); // 1MB string

      const result = await withTransaction(async (client) => {
        await client.query('UPDATE news_jobs SET raw_script = $1 WHERE id = $2', [
          largeScript,
          testJobId,
        ]);
        return 'success';
      });

      expect(result).toBe('success');

      const job = await pool.query('SELECT LENGTH(raw_script) as len FROM news_jobs WHERE id = $1', [
        testJobId,
      ]);
      expect(job.rows[0].len).toBe(1000000);
    });

    it('should handle Unicode and special characters', async () => {
      const unicodeScript = '🎥 News Broadcast 新闻播报 مذيع الأخبار';

      await withTransaction(async (client) => {
        await client.query('UPDATE news_jobs SET raw_script = $1 WHERE id = $2', [
          unicodeScript,
          testJobId,
        ]);
      });

      const job = await pool.query('SELECT raw_script FROM news_jobs WHERE id = $1', [testJobId]);
      expect(job.rows[0].raw_script).toBe(unicodeScript);
    });

    it('should handle NULL values correctly', async () => {
      await withTransaction(async (client) => {
        await client.query('UPDATE news_jobs SET avatar_script = NULL WHERE id = $1', [testJobId]);
      });

      const job = await pool.query('SELECT avatar_script FROM news_jobs WHERE id = $1', [testJobId]);
      expect(job.rows[0].avatar_script).toBeNull();
    });
  });
});

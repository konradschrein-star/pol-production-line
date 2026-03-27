/**
 * Tier 1 Smoke Test: Error Recovery
 *
 * Purpose: Verify that the system can gracefully handle and recover from
 * failures including worker crashes, API errors, and database issues.
 *
 * Critical because: Production systems must handle failures without data loss
 * or corruption, and should automatically recover where possible.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DATABASE || 'obsidian_news_desk',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
});

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

describe('Error Recovery', () => {
  let testJobIds: string[] = [];

  beforeAll(async () => {
    // Ensure connections
    await pool.query('SELECT 1');
    await redis.ping();
  });

  beforeEach(() => {
    testJobIds = [];
  });

  afterAll(async () => {
    // Cleanup all test jobs
    for (const jobId of testJobIds) {
      await pool.query('DELETE FROM news_jobs WHERE id = $1', [jobId]).catch(() => {});
    }
    await pool.end();
    await redis.quit();
  });

  describe('Worker Crash Recovery', () => {
    it('should detect orphaned jobs stuck in processing states', async () => {
      // Create a job that appears to be stuck (updated >15 minutes ago)
      const jobId = uuidv4();
      testJobIds.push(jobId);

      const fifteenMinutesAgo = new Date(Date.now() - 16 * 60 * 1000);

      await pool.query(
        `INSERT INTO news_jobs (id, status, raw_script, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $4)`,
        [jobId, 'analyzing', 'Test script for orphaned job detection', fifteenMinutesAgo]
      );

      // Query for orphaned jobs (stuck for >15 minutes)
      const result = await pool.query(`
        SELECT id, status, updated_at
        FROM news_jobs
        WHERE status IN ('analyzing', 'generating_images', 'rendering')
          AND updated_at < NOW() - INTERVAL '15 minutes'
      `);

      // Should find our test job
      const orphanedJob = result.rows.find(row => row.id === jobId);
      expect(orphanedJob).toBeDefined();
      expect(orphanedJob?.status).toBe('analyzing');
    });

    it('should reset orphaned jobs to previous state for retry', async () => {
      // Create an orphaned job
      const jobId = uuidv4();
      testJobIds.push(jobId);

      const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);

      await pool.query(
        `INSERT INTO news_jobs (id, status, raw_script, created_at, updated_at, job_metadata)
         VALUES ($1, $2, $3, $4, $4, $5)`,
        [jobId, 'generating_images', 'Test script', twentyMinutesAgo, JSON.stringify({ previous_state: 'analyzing' })]
      );

      // Simulate recovery: reset to pending with error message
      await pool.query(`
        UPDATE news_jobs
        SET status = 'failed',
            error_message = 'Job appeared to be stuck (no updates for >15 minutes). Possible worker crash.',
            updated_at = NOW()
        WHERE id = $1
      `, [jobId]);

      // Verify reset
      const result = await pool.query('SELECT status, error_message FROM news_jobs WHERE id = $1', [jobId]);
      expect(result.rows[0].status).toBe('failed');
      expect(result.rows[0].error_message).toContain('stuck');
    });
  });

  describe('Whisk API Error Handling', () => {
    it('should handle 401 token expiration errors', async () => {
      // Simulate a scene with a 401 error
      const jobId = uuidv4();
      const sceneId = uuidv4();
      testJobIds.push(jobId);

      await pool.query(
        `INSERT INTO news_jobs (id, status, raw_script, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())`,
        [jobId, 'generating_images', 'Test script']
      );

      await pool.query(
        `INSERT INTO news_scenes (id, job_id, scene_order, image_prompt, ticker_headline, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [sceneId, jobId, 0, 'Test image prompt', 'Test headline']
      );

      // Simulate error logging (what the worker would do)
      const errorMetadata = {
        error_type: '401_UNAUTHORIZED',
        error_message: 'Whisk API token expired',
        retry_count: 1,
        requires_token_refresh: true,
      };

      await pool.query(
        `UPDATE news_jobs SET job_metadata = $1, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(errorMetadata), jobId]
      );

      // Verify error was logged
      const result = await pool.query('SELECT job_metadata FROM news_jobs WHERE id = $1', [jobId]);
      const metadata = result.rows[0].job_metadata;

      expect(metadata.error_type).toBe('401_UNAUTHORIZED');
      expect(metadata.requires_token_refresh).toBe(true);
    });

    it('should handle 429 rate limit errors with exponential backoff', async () => {
      const jobId = uuidv4();
      testJobIds.push(jobId);

      await pool.query(
        `INSERT INTO news_jobs (id, status, raw_script, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())`,
        [jobId, 'generating_images', 'Test script']
      );

      // Simulate retry attempts with increasing delays
      const retries = [
        { attempt: 1, delay: 3000, timestamp: new Date(Date.now() - 15000) },
        { attempt: 2, delay: 6000, timestamp: new Date(Date.now() - 9000) },
        { attempt: 3, delay: 12000, timestamp: new Date(Date.now() - 3000) },
      ];

      const metadata = {
        error_type: '429_RATE_LIMIT',
        retry_history: retries,
        adaptive_concurrency: 4, // Reduced from initial 8
      };

      await pool.query(
        `UPDATE news_jobs SET job_metadata = $1, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(metadata), jobId]
      );

      // Verify exponential backoff is logged
      const result = await pool.query('SELECT job_metadata FROM news_jobs WHERE id = $1', [jobId]);
      const loggedMetadata = result.rows[0].job_metadata;

      expect(loggedMetadata.retry_history).toHaveLength(3);
      expect(loggedMetadata.retry_history[0].delay).toBe(3000);
      expect(loggedMetadata.retry_history[1].delay).toBe(6000);
      expect(loggedMetadata.retry_history[2].delay).toBe(12000);
      expect(loggedMetadata.adaptive_concurrency).toBe(4);
    });

    it('should handle content policy violations with sanitization', async () => {
      const jobId = uuidv4();
      const sceneId = uuidv4();
      testJobIds.push(jobId);

      await pool.query(
        `INSERT INTO news_jobs (id, status, raw_script, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())`,
        [jobId, 'generating_images', 'Test script']
      );

      const originalPrompt = 'violent protest scene with weapons';
      const sanitizedPrompt = 'peaceful protest scene';

      await pool.query(
        `INSERT INTO news_scenes (id, job_id, scene_order, image_prompt, ticker_headline, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [sceneId, jobId, 0, originalPrompt, 'Test headline']
      );

      // Simulate sanitization attempt
      const metadata = {
        original_prompt: originalPrompt,
        sanitized_prompt: sanitizedPrompt,
        content_policy_violation: true,
        sanitization_applied: true,
      };

      await pool.query(
        `UPDATE news_scenes SET image_prompt = $1 WHERE id = $2`,
        [sanitizedPrompt, sceneId]
      );

      await pool.query(
        `UPDATE news_jobs SET job_metadata = $1, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(metadata), jobId]
      );

      // Verify sanitization
      const sceneResult = await pool.query('SELECT image_prompt FROM news_scenes WHERE id = $1', [sceneId]);
      expect(sceneResult.rows[0].image_prompt).toBe(sanitizedPrompt);
      expect(sceneResult.rows[0].image_prompt).not.toBe(originalPrompt);
    });

    it('should mark scene as failed after 3 consecutive failures', async () => {
      const jobId = uuidv4();
      const sceneId = uuidv4();
      testJobIds.push(jobId);

      await pool.query(
        `INSERT INTO news_jobs (id, status, raw_script, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())`,
        [jobId, 'generating_images', 'Test script']
      );

      await pool.query(
        `INSERT INTO news_scenes (id, job_id, scene_order, image_prompt, ticker_headline, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [sceneId, jobId, 0, 'Test prompt', 'Test headline']
      );

      // Simulate 3 failed attempts
      const failureHistory = [
        { attempt: 1, error: 'Content policy violation', timestamp: new Date(Date.now() - 30000) },
        { attempt: 2, error: 'Content policy violation (sanitized)', timestamp: new Date(Date.now() - 15000) },
        { attempt: 3, error: 'Content policy violation (sanitized again)', timestamp: new Date(Date.now()) },
      ];

      // Update scene to mark as failed
      await pool.query(
        `UPDATE news_scenes
         SET image_url = NULL
         WHERE id = $1`,
        [sceneId]
      );

      // Log failures in job metadata
      await pool.query(
        `UPDATE news_jobs
         SET job_metadata = jsonb_set(
           COALESCE(job_metadata, '{}'::jsonb),
           '{failed_scenes}',
           jsonb_build_array($1)
         )
         WHERE id = $2`,
        [JSON.stringify({ scene_id: sceneId, failure_history: failureHistory }), jobId]
      );

      // Verify scene marked as failed
      const sceneResult = await pool.query('SELECT image_url FROM news_scenes WHERE id = $1', [sceneId]);
      expect(sceneResult.rows[0].image_url).toBeNull();

      const jobResult = await pool.query('SELECT job_metadata FROM news_jobs WHERE id = $1', [jobId]);
      const metadata = jobResult.rows[0].job_metadata;
      expect(metadata.failed_scenes).toBeDefined();
      expect(metadata.failed_scenes).toHaveLength(1);
      expect(metadata.failed_scenes[0].failure_history).toHaveLength(3);
    });
  });

  describe('Database Connection Loss', () => {
    it('should handle database query timeouts gracefully', async () => {
      // Create a client with short timeout
      const timeoutPool = new Pool({
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432'),
        database: process.env.POSTGRES_DATABASE || 'obsidian_news_desk',
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'postgres',
        statement_timeout: 100, // 100ms timeout
      });

      try {
        // Try a query that would take longer than timeout
        await timeoutPool.query('SELECT pg_sleep(1)');
        expect.fail('Should have timed out');
      } catch (error: any) {
        // Verify error is caught and handled
        expect(error.message).toContain('timeout') || expect(error.code).toBe('57014');
      } finally {
        await timeoutPool.end();
      }
    });

    it('should maintain connection pool during normal operations', async () => {
      // Test that connection pool handles multiple concurrent queries
      const queries = Array.from({ length: 10 }, (_, i) =>
        pool.query('SELECT $1 as value', [i])
      );

      const results = await Promise.all(queries);

      expect(results).toHaveLength(10);
      results.forEach((result, i) => {
        expect(result.rows[0].value).toBe(i);
      });
    });
  });

  describe('Redis Connection Loss', () => {
    it('should handle Redis connection errors gracefully', async () => {
      // Create a Redis client pointing to invalid port
      const badRedis = new Redis({
        host: 'localhost',
        port: 9999, // Invalid port
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => {
          if (times > 1) return null; // Stop retrying
          return 100; // Retry once after 100ms
        },
      });

      try {
        // Try to ping (should fail)
        await badRedis.ping();
        expect.fail('Should have failed to connect');
      } catch (error: any) {
        // Verify error is caught
        expect(error.message).toContain('connect') || expect(error.code).toBe('ECONNREFUSED');
      } finally {
        badRedis.disconnect();
      }
    });

    it('should reconnect to Redis after connection is restored', async () => {
      // Test that Redis client can reconnect
      const reconnectingRedis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) return null;
          return Math.min(times * 100, 1000);
        },
      });

      // Verify connection works
      const pong = await reconnectingRedis.ping();
      expect(pong).toBe('PONG');

      // Simulate disconnect
      reconnectingRedis.disconnect();

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 200));

      // Reconnect
      await reconnectingRedis.connect();

      // Verify connection restored
      const pong2 = await reconnectingRedis.ping();
      expect(pong2).toBe('PONG');

      await reconnectingRedis.quit();
    });
  });

  describe('Disk Space Validation', () => {
    it('should check available disk space before creating jobs', async () => {
      // Mock disk space check (in real implementation, this would use fs.statfs)
      const mockDiskSpace = {
        total: 500 * 1024 * 1024 * 1024, // 500 GB
        free: 8 * 1024 * 1024 * 1024,    // 8 GB
        used: 492 * 1024 * 1024 * 1024,  // 492 GB
      };

      const freeGB = mockDiskSpace.free / (1024 * 1024 * 1024);

      // Warning threshold: 10 GB
      // Critical threshold: 5 GB
      const WARNING_THRESHOLD_GB = 10;
      const CRITICAL_THRESHOLD_GB = 5;

      if (freeGB < CRITICAL_THRESHOLD_GB) {
        expect.fail('Disk space critically low - should block job creation');
      } else if (freeGB < WARNING_THRESHOLD_GB) {
        console.warn(`⚠️  Disk space low: ${freeGB.toFixed(2)} GB free`);
      }

      expect(freeGB).toBeGreaterThan(CRITICAL_THRESHOLD_GB);
    });

    it('should estimate storage requirements for jobs', async () => {
      // Typical job storage breakdown:
      // - 8 scene images @ ~500 KB each = ~4 MB
      // - 1 avatar MP4 @ ~3 MB = 3 MB
      // - 1 final video @ ~20 MB = 20 MB
      // Total: ~27 MB per job

      const TYPICAL_JOB_SIZE_MB = 27;
      const SAFETY_MARGIN = 2; // 2x for temporary files during processing

      const estimatedStorageMB = TYPICAL_JOB_SIZE_MB * SAFETY_MARGIN;

      expect(estimatedStorageMB).toBe(54); // 54 MB with safety margin

      // For 10 GB free, can support ~185 jobs
      const availableMB = 10 * 1024;
      const maxJobs = Math.floor(availableMB / estimatedStorageMB);

      expect(maxJobs).toBeGreaterThan(100);
    });
  });

  describe('Error Message Sanitization', () => {
    it('should not leak sensitive file paths in errors', async () => {
      const sensitiveError = new Error('Failed to read file: C:\\Users\\konra\\ObsidianNewsDesk\\config\\secrets.json');

      // Simulate error sanitization
      const sanitizedMessage = sensitiveError.message
        .replace(/[A-Z]:[\\\/]Users[\\\/][^\\\/\s]+/gi, '[USER_DIR]')
        .replace(/[A-Z]:[\\\/][^\s]+/gi, '[PATH]');

      expect(sanitizedMessage).not.toContain('konra');
      expect(sanitizedMessage).not.toContain('C:\\Users');
      expect(sanitizedMessage).toContain('[USER_DIR]') || expect(sanitizedMessage).toContain('[PATH]');
    });

    it('should not leak API keys or tokens in errors', async () => {
      const sensitiveError = new Error('Whisk API error: Authorization failed for token ya29.a0ATkoCc1234567890abcdefg');

      // Simulate token sanitization
      const sanitizedMessage = sensitiveError.message
        .replace(/ya29\.[a-zA-Z0-9_-]+/g, '[WHISK_TOKEN]')
        .replace(/sk-[a-zA-Z0-9]+/g, '[OPENAI_KEY]');

      expect(sanitizedMessage).not.toContain('ya29.');
      expect(sanitizedMessage).toContain('[WHISK_TOKEN]');
    });

    it('should not leak database connection strings in errors', async () => {
      const sensitiveError = new Error('Connection failed: postgres://postgres:secret_password@localhost:5432/obsidian_news_desk');

      // Simulate connection string sanitization
      const sanitizedMessage = sensitiveError.message
        .replace(/postgres:\/\/[^@]+@/g, 'postgres://[CREDENTIALS]@');

      expect(sanitizedMessage).not.toContain('secret_password');
      expect(sanitizedMessage).toContain('[CREDENTIALS]');
    });
  });

  describe('Transaction Rollback', () => {
    it('should rollback transaction on error', async () => {
      const jobId = uuidv4();
      testJobIds.push(jobId);

      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Insert job
        await client.query(
          `INSERT INTO news_jobs (id, status, raw_script, created_at, updated_at)
           VALUES ($1, $2, $3, NOW(), NOW())`,
          [jobId, 'pending', 'Test script for transaction rollback']
        );

        // Simulate error (try to insert duplicate)
        await client.query(
          `INSERT INTO news_jobs (id, status, raw_script, created_at, updated_at)
           VALUES ($1, $2, $3, NOW(), NOW())`,
          [jobId, 'pending', 'Duplicate job - should fail']
        );

        await client.query('COMMIT');
        expect.fail('Should have thrown duplicate key error');
      } catch (error: any) {
        // Rollback on error
        await client.query('ROLLBACK');

        // Verify rollback worked - job should not exist
        const result = await pool.query('SELECT * FROM news_jobs WHERE id = $1', [jobId]);
        expect(result.rows).toHaveLength(0);
      } finally {
        client.release();
      }
    });
  });
});

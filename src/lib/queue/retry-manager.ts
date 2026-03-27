/**
 * Job Retry Manager
 *
 * Manages automatic retry logic for failed jobs.
 * Uses exponential backoff to avoid overwhelming external services.
 *
 * MODULAR DESIGN: Reusable across all job types and content formats
 *
 * @module retry-manager
 */

import { db } from '../db';
import { queueAnalyze } from './queues';

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;           // Maximum retry attempts (default: 3)
  baseDelayMs: number;          // Base delay in milliseconds (default: 60000 = 1 min)
  maxDelayMs: number;           // Maximum delay in milliseconds (default: 900000 = 15 min)
  exponentialFactor: number;    // Exponential backoff multiplier (default: 2)
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 60 * 1000,       // 1 minute
  maxDelayMs: 15 * 60 * 1000,   // 15 minutes
  exponentialFactor: 2,
};

/**
 * Error types that should NOT be retried
 */
const NON_RETRYABLE_ERRORS = [
  'content policy violation',
  'invalid api key',
  'authentication failed',
  'quota exceeded',
  'payment required',
  'rate limit permanent',
  'invalid input',
  'validation error',
];

/**
 * Retry Manager
 */
export class RetryManager {
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  /**
   * Calculate delay for next retry using exponential backoff
   *
   * @param attemptNumber - Retry attempt number (1, 2, 3...)
   * @returns Delay in milliseconds
   */
  calculateBackoff(attemptNumber: number): number {
    const delay = this.config.baseDelayMs * Math.pow(this.config.exponentialFactor, attemptNumber - 1);
    return Math.min(delay, this.config.maxDelayMs);
  }

  /**
   * Check if error is retryable
   *
   * @param error - Error message or Error object
   * @returns True if error is retryable
   */
  isRetryableError(error: string | Error): boolean {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const lowerMessage = errorMessage.toLowerCase();

    // Check if error matches non-retryable patterns
    for (const pattern of NON_RETRYABLE_ERRORS) {
      if (lowerMessage.includes(pattern)) {
        return false;
      }
    }

    return true; // Default: assume error is retryable
  }

  /**
   * Mark job as failed with retry possibility
   *
   * @param jobId - Job UUID
   * @param error - Error message
   * @param isRetryable - Whether error is retryable (auto-detected if not provided)
   */
  async markJobFailed(
    jobId: string,
    error: string | Error,
    isRetryable?: boolean
  ): Promise<void> {
    try {
      const errorMessage = typeof error === 'string' ? error : error.message;
      const canRetry = isRetryable !== undefined
        ? isRetryable
        : this.isRetryableError(errorMessage);

      await db.query(
        `UPDATE news_jobs
         SET status = 'failed',
             error_message = $1,
             is_retryable = $2,
             retry_error = $3,
             updated_at = NOW()
         WHERE id = $4`,
        [errorMessage, canRetry, errorMessage, jobId]
      );

      console.log(`❌ [RetryManager] Job ${jobId} failed (retryable: ${canRetry}): ${errorMessage}`);
    } catch (err) {
      console.error('❌ [RetryManager] Failed to mark job as failed:', err);
    }
  }

  /**
   * Retry a failed job
   *
   * @param jobId - Job UUID
   * @returns True if retry was scheduled, false otherwise
   */
  async retryJob(jobId: string): Promise<boolean> {
    try {
      // Get job details
      const result = await db.query(
        `SELECT id, status, retry_count, max_retries, is_retryable, raw_script, job_metadata
         FROM news_jobs
         WHERE id = $1`,
        [jobId]
      );

      if (result.rows.length === 0) {
        console.warn(`⚠️  [RetryManager] Job ${jobId} not found`);
        return false;
      }

      const job = result.rows[0];

      // Check if job is retryable
      if (job.status !== 'failed') {
        console.warn(`⚠️  [RetryManager] Job ${jobId} is not failed (status: ${job.status})`);
        return false;
      }

      if (!job.is_retryable) {
        console.warn(`⚠️  [RetryManager] Job ${jobId} is not retryable (permanent failure)`);
        return false;
      }

      if (job.retry_count >= job.max_retries) {
        console.warn(`⚠️  [RetryManager] Job ${jobId} exceeded max retries (${job.retry_count}/${job.max_retries})`);

        // Mark as permanently failed
        await db.query(
          `UPDATE news_jobs
           SET is_retryable = false, updated_at = NOW()
           WHERE id = $1`,
          [jobId]
        );

        return false;
      }

      // Increment retry count
      const newRetryCount = job.retry_count + 1;

      await db.query(
        `UPDATE news_jobs
         SET retry_count = $1,
             last_retry_at = NOW(),
             status = 'pending',
             error_message = NULL,
             updated_at = NOW()
         WHERE id = $2`,
        [newRetryCount, jobId]
      );

      console.log(`🔄 [RetryManager] Retrying job ${jobId} (attempt ${newRetryCount}/${job.max_retries})`);

      // Re-queue job for analysis
      const metadata = job.job_metadata || {};
      await queueAnalyze.add('analyze-script', {
        jobId: job.id,
        rawScript: job.raw_script,
        provider: metadata.ai_provider,
      });

      console.log(`✅ [RetryManager] Job ${jobId} queued for retry`);

      return true;
    } catch (error) {
      console.error('❌ [RetryManager] Failed to retry job:', error);
      return false;
    }
  }

  /**
   * Find and retry all eligible failed jobs
   *
   * @returns Number of jobs retried
   */
  async retryAllEligibleJobs(): Promise<number> {
    try {
      // Find jobs eligible for retry (failed, retryable, not at max retries)
      const result = await db.query(`
        SELECT id
        FROM news_jobs
        WHERE status = 'failed'
          AND is_retryable = true
          AND retry_count < max_retries
          AND (last_retry_at IS NULL OR last_retry_at < NOW() - INTERVAL '5 minutes')
        ORDER BY created_at DESC
        LIMIT 100
      `);

      console.log(`🔍 [RetryManager] Found ${result.rows.length} jobs eligible for retry`);

      let retriedCount = 0;
      for (const row of result.rows) {
        const success = await this.retryJob(row.id);
        if (success) retriedCount++;
      }

      console.log(`✅ [RetryManager] Retried ${retriedCount}/${result.rows.length} jobs`);

      return retriedCount;
    } catch (error) {
      console.error('❌ [RetryManager] Failed to retry eligible jobs:', error);
      return 0;
    }
  }

  /**
   * Get retry statistics
   */
  async getRetryStats(): Promise<{
    totalFailed: number;
    retryableCount: number;
    permanentFailures: number;
    avgRetryCount: number;
  }> {
    try {
      const result = await db.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'failed') as total_failed,
          COUNT(*) FILTER (WHERE status = 'failed' AND is_retryable = true) as retryable_count,
          COUNT(*) FILTER (WHERE status = 'failed' AND is_retryable = false) as permanent_failures,
          AVG(retry_count) FILTER (WHERE status = 'failed') as avg_retry_count
        FROM news_jobs
      `);

      const stats = result.rows[0];

      return {
        totalFailed: parseInt(stats.total_failed || 0),
        retryableCount: parseInt(stats.retryable_count || 0),
        permanentFailures: parseInt(stats.permanent_failures || 0),
        avgRetryCount: parseFloat(stats.avg_retry_count || 0),
      };
    } catch (error) {
      console.error('❌ [RetryManager] Failed to get retry stats:', error);
      throw new Error('Failed to get retry stats');
    }
  }
}

// Singleton instance
export const retryManager = new RetryManager();

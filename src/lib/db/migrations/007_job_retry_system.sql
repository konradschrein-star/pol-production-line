/**
 * Migration 007: Job Retry System
 *
 * Adds retry tracking for failed jobs.
 * Enables automatic recovery from transient failures.
 */

-- Add retry tracking columns to news_jobs
ALTER TABLE news_jobs
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS retry_error TEXT,
ADD COLUMN IF NOT EXISTS is_retryable BOOLEAN DEFAULT true;

-- Index for finding retryable failed jobs
CREATE INDEX IF NOT EXISTS idx_news_jobs_retryable
ON news_jobs (status, retry_count, last_retry_at)
WHERE is_retryable = true AND status = 'failed';

-- Comments
COMMENT ON COLUMN news_jobs.retry_count IS 'Number of retry attempts made';
COMMENT ON COLUMN news_jobs.max_retries IS 'Maximum retries before permanent failure (default: 3)';
COMMENT ON COLUMN news_jobs.last_retry_at IS 'Timestamp of last retry attempt';
COMMENT ON COLUMN news_jobs.retry_error IS 'Error message from last retry attempt';
COMMENT ON COLUMN news_jobs.is_retryable IS 'Whether this job can be retried (false for permanent failures)';

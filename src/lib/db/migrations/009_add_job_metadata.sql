-- Migration: Add job_metadata column for flexible job configuration
-- Created: 2026-03-26
-- Purpose: Store job-specific metadata like skip_review flag, AI provider settings, etc.

-- Add job_metadata JSONB column to news_jobs table
ALTER TABLE news_jobs
ADD COLUMN IF NOT EXISTS job_metadata JSONB DEFAULT NULL;

-- Create index for faster JSONB queries
CREATE INDEX IF NOT EXISTS idx_news_jobs_metadata ON news_jobs USING gin(job_metadata);

-- Add comment for documentation
COMMENT ON COLUMN news_jobs.job_metadata IS 'Flexible JSONB field for job-specific configuration (e.g., skip_review, ai_provider, style_preset)';

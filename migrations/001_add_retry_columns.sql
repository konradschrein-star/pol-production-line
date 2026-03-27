-- Migration 001: Add retry tracking columns to news_scenes
-- This enables proper retry logic and failure tracking for image generation

-- Add retry_count column to track number of regeneration attempts
ALTER TABLE news_scenes
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- Add failed_permanently flag to mark scenes that have exceeded retry limit
ALTER TABLE news_scenes
ADD COLUMN IF NOT EXISTS failed_permanently BOOLEAN DEFAULT false;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_news_scenes_retry_count ON news_scenes(retry_count);
CREATE INDEX IF NOT EXISTS idx_news_scenes_failed_permanently ON news_scenes(failed_permanently);

-- Add composite index for common query pattern (finding failed scenes for a job)
CREATE INDEX IF NOT EXISTS idx_news_scenes_job_retry ON news_scenes(job_id, failed_permanently, retry_count);

COMMENT ON COLUMN news_scenes.retry_count IS 'Number of times image generation has been retried for this scene';
COMMENT ON COLUMN news_scenes.failed_permanently IS 'True if scene has exceeded maximum retry attempts';

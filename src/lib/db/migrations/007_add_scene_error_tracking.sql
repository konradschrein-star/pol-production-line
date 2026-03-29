-- Migration 007: Add scene-level error tracking
-- Enhances error visibility for quality check system
-- Date: 2026-03-29

BEGIN;

-- Add new columns for detailed error tracking
ALTER TABLE news_scenes
  ADD COLUMN IF NOT EXISTS error_category VARCHAR(50),
  ADD COLUMN IF NOT EXISTS sanitization_attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error_code VARCHAR(50);

-- Create index for error filtering (partial index for failed scenes only)
CREATE INDEX IF NOT EXISTS idx_news_scenes_error_category
  ON news_scenes(error_category)
  WHERE error_category IS NOT NULL;

-- Backfill existing failed scenes with 'unknown' category
UPDATE news_scenes
SET error_category = 'unknown'
WHERE generation_status = 'failed' AND error_category IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN news_scenes.error_category IS 'Categorized error type: policy_violation, timeout, api_error, rate_limit, auth_error, unknown';
COMMENT ON COLUMN news_scenes.sanitization_attempts IS 'Number of prompt sanitization attempts (max 3)';
COMMENT ON COLUMN news_scenes.last_error_code IS 'Maps to ErrorCode enum for detailed error handling';

COMMIT;

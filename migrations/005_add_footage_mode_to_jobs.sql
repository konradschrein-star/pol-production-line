-- Migration 005: Add footage mode selector to news_jobs table
-- Phase 1: Video Footage Integration
-- Date: 2026-03-24

-- Add footage mode column (controls whether to generate images, videos, or mixed)
ALTER TABLE news_jobs
ADD COLUMN IF NOT EXISTS footage_mode VARCHAR(20) DEFAULT 'images' NOT NULL;

-- Add check constraint for footage_mode
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'news_jobs_footage_mode_check'
  ) THEN
    ALTER TABLE news_jobs
    ADD CONSTRAINT news_jobs_footage_mode_check
    CHECK (footage_mode IN ('images', 'videos', 'mixed'));
  END IF;
END $$;

-- Add index for filtering by footage mode
CREATE INDEX IF NOT EXISTS idx_news_jobs_footage_mode
ON news_jobs(footage_mode);

-- Add comments for documentation
COMMENT ON COLUMN news_jobs.footage_mode IS 'Media generation mode: images (Whisk only), videos (Pexels only), or mixed (both)';

-- Migration: Add word timing columns to news_scenes
-- Purpose: Store precise word timestamps for each scene to enable database-driven pacing
-- This eliminates the need for fuzzy string matching during render
-- Created: 2026-03-28

-- Add timing columns to news_scenes table
ALTER TABLE news_scenes
ADD COLUMN IF NOT EXISTS word_start_time NUMERIC,
ADD COLUMN IF NOT EXISTS word_end_time NUMERIC;

-- Add comment explaining the columns
COMMENT ON COLUMN news_scenes.word_start_time IS 'Start time in seconds of the first word in this scene (from Whisper transcription)';
COMMENT ON COLUMN news_scenes.word_end_time IS 'End time in seconds of the last word in this scene (from Whisper transcription)';

-- Create index for efficient querying by timing
CREATE INDEX IF NOT EXISTS idx_news_scenes_timing ON news_scenes(word_start_time, word_end_time) WHERE word_start_time IS NOT NULL;

-- Add check constraint to ensure timing is logical
ALTER TABLE news_scenes
ADD CONSTRAINT chk_scene_timing_valid
CHECK (
  (word_start_time IS NULL AND word_end_time IS NULL) OR
  (word_start_time IS NOT NULL AND word_end_time IS NOT NULL AND word_end_time >= word_start_time)
);

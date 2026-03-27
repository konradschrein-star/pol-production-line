-- Migration 002: Add advanced rendering columns to news_jobs
-- Supports word-level timestamps for precise scene transitions and thumbnail generation

-- Add word_timestamps for advanced rendering with sentence-based transitions
ALTER TABLE news_jobs
ADD COLUMN IF NOT EXISTS word_timestamps JSONB;

-- Add thumbnail tracking for video previews
ALTER TABLE news_jobs
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

ALTER TABLE news_jobs
ADD COLUMN IF NOT EXISTS thumbnail_generated_at TIMESTAMP WITH TIME ZONE;

-- Add index for thumbnail query performance
CREATE INDEX IF NOT EXISTS idx_news_jobs_thumbnail_generated_at 
ON news_jobs(thumbnail_generated_at) 
WHERE thumbnail_generated_at IS NOT NULL;

-- Add GIN index for JSONB word_timestamps queries
CREATE INDEX IF NOT EXISTS idx_news_jobs_word_timestamps 
ON news_jobs USING GIN (word_timestamps)
WHERE word_timestamps IS NOT NULL;

COMMENT ON COLUMN news_jobs.word_timestamps IS 'Array of {word, start, end} objects for precise audio-video sync';
COMMENT ON COLUMN news_jobs.thumbnail_url IS 'URL/path to video thumbnail image';
COMMENT ON COLUMN news_jobs.thumbnail_generated_at IS 'Timestamp when thumbnail was generated';

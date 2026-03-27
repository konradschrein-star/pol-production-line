-- Migration 006: Add video tracking to generation_history table
-- Phase 1: Video Footage Integration
-- Date: 2026-03-24

-- Add media type column
ALTER TABLE generation_history
ADD COLUMN IF NOT EXISTS media_type VARCHAR(20) DEFAULT 'image';

-- Add video source column (e.g., "pexels", "pixabay", "manual_upload")
ALTER TABLE generation_history
ADD COLUMN IF NOT EXISTS video_source VARCHAR(50);

-- Add video metadata column (JSONB for flexible metadata storage)
ALTER TABLE generation_history
ADD COLUMN IF NOT EXISTS video_metadata JSONB;

-- Add GIN index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_generation_history_video_metadata
ON generation_history USING GIN (video_metadata);

-- Add comments for documentation
COMMENT ON COLUMN generation_history.media_type IS 'Type of media generated: image or video';
COMMENT ON COLUMN generation_history.video_source IS 'Source of video: pexels, pixabay, manual_upload, etc.';
COMMENT ON COLUMN generation_history.video_metadata IS 'Full video metadata (resolution, codec, duration, download_url, etc.)';

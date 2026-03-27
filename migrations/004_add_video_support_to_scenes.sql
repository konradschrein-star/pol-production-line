-- Migration 004: Add video support to news_scenes table
-- Phase 1: Video Footage Integration
-- Date: 2026-03-24

-- Add media type discriminator column
ALTER TABLE news_scenes
ADD COLUMN IF NOT EXISTS media_type VARCHAR(20) DEFAULT 'image' NOT NULL;

-- Add video-specific columns (all nullable for backwards compatibility)
ALTER TABLE news_scenes
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS video_duration_seconds REAL,
ADD COLUMN IF NOT EXISTS video_resolution VARCHAR(20),
ADD COLUMN IF NOT EXISTS video_codec VARCHAR(50);

-- Add check constraint for media_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'news_scenes_media_type_check'
  ) THEN
    ALTER TABLE news_scenes
    ADD CONSTRAINT news_scenes_media_type_check
    CHECK (media_type IN ('image', 'video'));
  END IF;
END $$;

-- Add index for filtering by media type
CREATE INDEX IF NOT EXISTS idx_news_scenes_media_type
ON news_scenes(media_type);

-- Add comments for documentation
COMMENT ON COLUMN news_scenes.media_type IS 'Type of media: image (Whisk-generated) or video (Pexels stock footage)';
COMMENT ON COLUMN news_scenes.video_url IS 'Local filesystem path to video file (e.g., C:\Users\konra\ObsidianNewsDesk\footage\scene-123.mp4)';
COMMENT ON COLUMN news_scenes.video_duration_seconds IS 'Video duration in seconds (extracted via FFmpeg probe)';
COMMENT ON COLUMN news_scenes.video_resolution IS 'Video resolution (e.g., "1920x1080")';
COMMENT ON COLUMN news_scenes.video_codec IS 'Video codec (e.g., "h264", "vp9")';

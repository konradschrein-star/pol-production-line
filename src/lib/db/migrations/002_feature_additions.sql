-- Migration: Feature Additions (8 Features)
-- Date: 2026-03-22
-- Description: Adds columns and tables for error tracking, style presets, and thumbnails

-- ============================================================================
-- FEATURE 2: ERROR TRACKING
-- ============================================================================

-- Add retry tracking to scenes
ALTER TABLE news_scenes
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

ALTER TABLE news_scenes
ADD COLUMN IF NOT EXISTS failed_permanently BOOLEAN DEFAULT FALSE;

-- Index for filtering failed scenes
CREATE INDEX IF NOT EXISTS idx_news_scenes_failed
ON news_scenes(failed_permanently)
WHERE failed_permanently = TRUE;

-- ============================================================================
-- FEATURE 3: STYLE CONSISTENCY SYSTEM
-- ============================================================================

-- Style presets for consistent visual branding
CREATE TABLE IF NOT EXISTS style_presets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    reference_image_urls JSONB,            -- Array of reference image URLs
    prompt_prefix TEXT,                     -- Prepended to image prompts
    prompt_suffix TEXT,                     -- Appended to image prompts
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add style preset reference to jobs
ALTER TABLE news_jobs
ADD COLUMN IF NOT EXISTS style_preset_id UUID
REFERENCES style_presets(id) ON DELETE SET NULL;

-- Create index for default preset lookup
CREATE INDEX IF NOT EXISTS idx_style_presets_default
ON style_presets(is_default)
WHERE is_default = TRUE;

-- Insert default style presets
INSERT INTO style_presets (name, description, prompt_suffix, is_default)
VALUES
('Professional News', 'Clean, professional broadcast quality',
 ', professional news photography, broadcast quality, sharp focus, high resolution', TRUE),
('Dramatic Documentary', 'Cinematic with dramatic lighting',
 ', cinematic documentary style, dramatic lighting, film grain, moody atmosphere', FALSE),
('Minimalist Modern', 'Clean compositions with bold colors',
 ', minimalist modern design, clean composition, high contrast, bold colors', FALSE),
('Vintage Broadcast', 'Retro 1980s-90s news aesthetic',
 ', vintage broadcast style, 1980s aesthetic, warm color grading, retro look', FALSE),
('Tech Innovation', 'Futuristic technology-focused',
 ', high-tech futuristic style, neon accents, sleek design, modern technology', FALSE)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- FEATURE 7: THUMBNAIL GENERATION
-- ============================================================================

-- Add thumbnail tracking to jobs
ALTER TABLE news_jobs
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

ALTER TABLE news_jobs
ADD COLUMN IF NOT EXISTS thumbnail_generated_at TIMESTAMP WITH TIME ZONE;

-- Index for thumbnail queries
CREATE INDEX IF NOT EXISTS idx_news_jobs_thumbnail
ON news_jobs(thumbnail_url)
WHERE thumbnail_url IS NOT NULL;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Migration 002_feature_additions.sql completed successfully';
    RAISE NOTICE 'Added columns: retry_count, failed_permanently, style_preset_id, thumbnail_url, thumbnail_generated_at';
    RAISE NOTICE 'Added tables: style_presets';
    RAISE NOTICE 'Inserted 5 default style presets';
END $$;

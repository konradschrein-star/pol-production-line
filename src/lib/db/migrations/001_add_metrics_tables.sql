-- Migration: Add Performance Metrics Tables
-- Date: 2026-03-22
-- Description: Adds job_metrics and generation_history tables for performance tracking

-- ============================================================================
-- PERFORMANCE METRICS & ANALYTICS TABLES
-- ============================================================================

-- Job-level performance metrics
-- Tracks timing and resource usage for each job
CREATE TABLE IF NOT EXISTS job_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES news_jobs(id) ON DELETE CASCADE,

    -- Timing metrics (in milliseconds)
    analysis_time_ms INTEGER,               -- Time to analyze script
    total_image_gen_time_ms INTEGER,        -- Total time for all images
    avatar_gen_time_ms INTEGER,             -- Time to generate avatar (if automated)
    render_time_ms INTEGER,                 -- Time to render final video
    total_processing_time_ms INTEGER,       -- End-to-end time

    -- Resource metrics
    scene_count INTEGER,                    -- Number of scenes in job
    final_video_size_bytes BIGINT,          -- Output video file size
    final_video_duration_seconds REAL,      -- Output video duration

    -- Quality metrics
    failed_scenes_count INTEGER DEFAULT 0,  -- Number of scenes that failed generation
    retry_count INTEGER DEFAULT 0,          -- Number of retries required

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_job_metric UNIQUE(job_id)
);

-- Scene regeneration audit trail
-- Tracks all image generation attempts for debugging and quality analysis
CREATE TABLE IF NOT EXISTS generation_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scene_id UUID NOT NULL REFERENCES news_scenes(id) ON DELETE CASCADE,
    job_id UUID NOT NULL,                   -- Denormalized for easier querying

    attempt_number INTEGER NOT NULL,        -- 1, 2, 3... (for retry tracking)
    image_url TEXT,                         -- Generated image URL (null if failed)

    -- Generation parameters (for reproducibility)
    generation_params JSONB,                -- Prompt, aspect ratio, model, etc.
    whisk_request_id TEXT,                  -- Whisk API request ID (for debugging)

    -- Outcome
    success BOOLEAN NOT NULL,               -- Did this attempt succeed?
    error_message TEXT,                     -- Error details if failed
    generation_time_ms INTEGER,             -- Time taken for this specific attempt

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_metrics_job_id ON job_metrics(job_id);
CREATE INDEX IF NOT EXISTS idx_job_metrics_created_at ON job_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generation_history_scene_id ON generation_history(scene_id);
CREATE INDEX IF NOT EXISTS idx_generation_history_job_id ON generation_history(job_id);
CREATE INDEX IF NOT EXISTS idx_generation_history_created_at ON generation_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generation_history_success ON generation_history(success);

-- Verification
DO $$
BEGIN
    RAISE NOTICE 'Migration 001_add_metrics_tables.sql completed successfully';
    RAISE NOTICE 'Added tables: job_metrics, generation_history';
END $$;

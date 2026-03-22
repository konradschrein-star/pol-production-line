-- Add performance metrics tracking tables
-- Migration: add_metrics_tables.sql

-- Job-level performance metrics
CREATE TABLE IF NOT EXISTS job_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES news_jobs(id) ON DELETE CASCADE,

    -- Timing metrics (in milliseconds)
    analysis_time_ms INTEGER,
    total_image_gen_time_ms INTEGER,
    render_time_ms INTEGER,
    total_processing_time_ms INTEGER,

    -- Job characteristics
    scene_count INTEGER,
    final_video_size_bytes BIGINT,
    final_video_duration_seconds DECIMAL(10, 2),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure one metrics record per job
    UNIQUE(job_id)
);

-- Scene-level generation history (audit trail for regenerations)
CREATE TABLE IF NOT EXISTS generation_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scene_id UUID NOT NULL REFERENCES news_scenes(id) ON DELETE CASCADE,
    job_id UUID NOT NULL,

    -- Generation metadata
    attempt_number INTEGER NOT NULL,
    image_url TEXT,
    generation_params JSONB,
    whisk_request_id TEXT,

    -- Success/failure tracking
    status VARCHAR(50) NOT NULL DEFAULT 'completed',
    error_message TEXT,

    -- Timing
    generation_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_gen_history_status CHECK (
        status IN ('completed', 'failed', 'cancelled')
    )
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_job_metrics_job_id ON job_metrics(job_id);
CREATE INDEX IF NOT EXISTS idx_job_metrics_created_at ON job_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generation_history_scene_id ON generation_history(scene_id);
CREATE INDEX IF NOT EXISTS idx_generation_history_job_id ON generation_history(job_id);
CREATE INDEX IF NOT EXISTS idx_generation_history_created_at ON generation_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generation_history_status ON generation_history(status);

-- Comments for documentation
COMMENT ON TABLE job_metrics IS 'Performance metrics for completed jobs';
COMMENT ON TABLE generation_history IS 'Audit trail for scene image generation attempts (including regenerations)';
COMMENT ON COLUMN job_metrics.analysis_time_ms IS 'Time spent in script analysis (LLM call)';
COMMENT ON COLUMN job_metrics.total_image_gen_time_ms IS 'Total time for all image generation';
COMMENT ON COLUMN job_metrics.render_time_ms IS 'Time spent rendering video with Remotion';
COMMENT ON COLUMN job_metrics.total_processing_time_ms IS 'End-to-end processing time';
COMMENT ON COLUMN generation_history.attempt_number IS 'Sequential attempt number (1 = initial, 2+ = regeneration)';

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Jobs table
CREATE TABLE news_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    raw_script TEXT NOT NULL,
    avatar_script TEXT,
    avatar_mp4_url TEXT,
    final_video_url TEXT,
    error_message TEXT,
    cancellation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_status CHECK (
        status IN ('pending', 'analyzing', 'generating_images', 'review_assets', 'rendering', 'completed', 'failed', 'cancelled')
    )
);

-- Scenes table
CREATE TABLE news_scenes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES news_jobs(id) ON DELETE CASCADE,
    scene_order INTEGER NOT NULL,
    image_prompt TEXT NOT NULL,
    ticker_headline VARCHAR(200) NOT NULL,
    image_url TEXT,
    generation_status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_generation_status CHECK (
        generation_status IN ('pending', 'generating', 'completed', 'failed')
    ),

    UNIQUE(job_id, scene_order)
);

-- Indexes for performance
CREATE INDEX idx_news_jobs_status ON news_jobs(status);
CREATE INDEX idx_news_jobs_created_at ON news_jobs(created_at DESC);
CREATE INDEX idx_news_scenes_job_id ON news_scenes(job_id);
CREATE INDEX idx_news_scenes_status ON news_scenes(generation_status);

-- Full-text search index for faster searches
CREATE INDEX idx_news_jobs_script_search ON news_jobs
    USING gin(to_tsvector('english', raw_script || ' ' || COALESCE(avatar_script, '')));

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to both tables
CREATE TRIGGER update_news_jobs_updated_at
    BEFORE UPDATE ON news_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_news_scenes_updated_at
    BEFORE UPDATE ON news_scenes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PERFORMANCE METRICS & ANALYTICS TABLES
-- ============================================================================

-- Job-level performance metrics
-- Tracks timing and resource usage for each job
CREATE TABLE job_metrics (
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
CREATE TABLE generation_history (
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
CREATE INDEX idx_job_metrics_job_id ON job_metrics(job_id);
CREATE INDEX idx_job_metrics_created_at ON job_metrics(created_at DESC);
CREATE INDEX idx_generation_history_scene_id ON generation_history(scene_id);
CREATE INDEX idx_generation_history_job_id ON generation_history(job_id);
CREATE INDEX idx_generation_history_created_at ON generation_history(created_at DESC);
CREATE INDEX idx_generation_history_success ON generation_history(success);

-- ============================================================================
-- STYLE PRESETS TABLE
-- ============================================================================

-- Style presets for consistent visual branding
CREATE TABLE IF NOT EXISTS style_presets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    config JSONB NOT NULL DEFAULT '{}',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger for updated_at
CREATE TRIGGER update_style_presets_updated_at
    BEFORE UPDATE ON style_presets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default style presets
INSERT INTO style_presets (name, description, config, is_default) VALUES
('Default', 'Standard news broadcast style', '{"aspect_ratio": "landscape"}', TRUE),
('Cinematic', 'Cinematic wide-angle shots', '{"aspect_ratio": "landscape", "style": "cinematic"}', FALSE),
('Retro Broadcast', 'Vintage news aesthetic', '{"aspect_ratio": "square", "style": "retro"}', FALSE)
ON CONFLICT (name) DO NOTHING;

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

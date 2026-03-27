-- Migration 003: Add performance indexes for common queries
-- Improves query performance for job listings, scene lookups, and status filtering

-- Index for job_id lookups in scenes table (most common query)
CREATE INDEX IF NOT EXISTS idx_news_scenes_job_id 
ON news_scenes(job_id);

-- Index for status filtering in jobs table
CREATE INDEX IF NOT EXISTS idx_news_jobs_status 
ON news_jobs(status);

-- Composite index for common scene queries (job + generation status)
CREATE INDEX IF NOT EXISTS idx_news_scenes_job_status
ON news_scenes(job_id, generation_status);

-- Index for created_at sorting (used in job listings)
CREATE INDEX IF NOT EXISTS idx_news_jobs_created_at 
ON news_jobs(created_at DESC);

-- Index for updated_at sorting (used in job listings)
CREATE INDEX IF NOT EXISTS idx_news_jobs_updated_at 
ON news_jobs(updated_at DESC);

-- Composite index for status + created_at (common filter + sort combo)
CREATE INDEX IF NOT EXISTS idx_news_jobs_status_created 
ON news_jobs(status, created_at DESC);

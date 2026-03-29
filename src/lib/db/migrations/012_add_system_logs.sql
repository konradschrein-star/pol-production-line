-- Migration 012: Add System Logs
-- Purpose: Structured logging for debugging and monitoring
-- Created: 2026-03-29

-- Create system_logs table
CREATE TABLE IF NOT EXISTS system_logs (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT NOW(),
  level VARCHAR(20) NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error', 'critical')),
  category VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  details JSONB,
  job_id UUID REFERENCES news_jobs(id) ON DELETE SET NULL,
  scene_id UUID REFERENCES news_scenes(id) ON DELETE SET NULL
);

-- Create indexes for efficient queries
CREATE INDEX idx_logs_timestamp ON system_logs(timestamp DESC);
CREATE INDEX idx_logs_level ON system_logs(level);
CREATE INDEX idx_logs_job ON system_logs(job_id);
CREATE INDEX idx_logs_category ON system_logs(category);
CREATE INDEX idx_logs_level_category ON system_logs(level, category);

-- Add comment for documentation
COMMENT ON TABLE system_logs IS 'Structured logs for debugging and monitoring';
COMMENT ON COLUMN system_logs.level IS 'Log severity: debug, info, warn, error, critical';
COMMENT ON COLUMN system_logs.category IS 'Log category: image_generation, token_refresh, rendering, system';
COMMENT ON COLUMN system_logs.details IS 'Additional structured data (error stack traces, context, etc.)';

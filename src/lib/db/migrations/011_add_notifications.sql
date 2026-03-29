-- Migration 011: Add Notifications System
-- Purpose: Persistent notification tracking for errors, warnings, and system events
-- Created: 2026-03-29

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES news_jobs(id) ON DELETE CASCADE,
  scene_id UUID REFERENCES news_scenes(id) ON DELETE CASCADE,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'error')),
  category VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  read BOOLEAN DEFAULT FALSE
);

-- Create indexes for efficient queries
CREATE INDEX idx_notifications_job ON notifications(job_id);
CREATE INDEX idx_notifications_scene ON notifications(scene_id);
CREATE INDEX idx_notifications_unread ON notifications(read, created_at DESC);
CREATE INDEX idx_notifications_severity ON notifications(severity, read);

-- Add comment for documentation
COMMENT ON TABLE notifications IS 'Persistent notifications for errors, warnings, and system events';
COMMENT ON COLUMN notifications.severity IS 'Notification severity: info, warning, or error';
COMMENT ON COLUMN notifications.category IS 'Notification category: image_generation, token_refresh, rendering, system';
COMMENT ON COLUMN notifications.details IS 'Additional structured data (error messages, retry counts, etc.)';

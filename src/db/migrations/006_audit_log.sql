-- Migration 006: Audit Log Table
-- Purpose: Track security-sensitive operations for compliance and forensics
-- Created: March 28, 2026 (Phase 8: Performance & Security)

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Event classification
  event_type VARCHAR(50) NOT NULL, -- 'auth', 'job_delete', 'scene_update', etc.
  severity VARCHAR(20) NOT NULL DEFAULT 'info', -- 'info', 'warning', 'critical'

  -- Actor information
  actor VARCHAR(100), -- IP address or API key hash
  ip_address VARCHAR(45), -- IPv4 or IPv6
  user_agent TEXT,

  -- Resource information
  resource_type VARCHAR(50), -- 'job', 'scene', 'settings', etc.
  resource_id UUID, -- job_id or scene_id
  action VARCHAR(50), -- 'create', 'update', 'delete', 'access'

  -- Additional context
  details JSONB -- Free-form metadata

  -- Note: No foreign key constraints. Audit logs are polymorphic (resource_id can
  -- reference jobs, scenes, presets, etc.) and should remain immutable even if
  -- referenced resources are deleted. Orphaned resource_ids are acceptable.
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_event_type ON audit_log (event_type);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_log (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_severity ON audit_log (severity) WHERE severity IN ('warning', 'critical');
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log (actor);

-- Enable row-level security (future enhancement for multi-tenancy)
-- ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Comment for documentation
COMMENT ON TABLE audit_log IS 'Security audit trail for compliance and forensics';
COMMENT ON COLUMN audit_log.event_type IS 'Category of event (auth, job_delete, scene_update, etc.)';
COMMENT ON COLUMN audit_log.severity IS 'Event severity level: info, warning, critical';
COMMENT ON COLUMN audit_log.actor IS 'IP address or hashed API key identifier';
COMMENT ON COLUMN audit_log.details IS 'Arbitrary JSON metadata specific to event type';

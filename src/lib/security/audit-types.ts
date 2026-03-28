/**
 * Audit Log Event Type Definitions
 *
 * Defines all auditable events in the system for security monitoring
 * and compliance tracking.
 */

export type AuditSeverity = 'info' | 'warning' | 'critical';

export type AuditEventType =
  // Authentication events
  | 'auth_success'
  | 'auth_failed'
  | 'auth_missing'
  | 'admin_access'
  | 'admin_auth_failed'
  | 'admin_access_denied'

  // Job lifecycle events
  | 'job_create'
  | 'job_update'
  | 'job_delete'
  | 'job_cancel'
  | 'job_retry'

  // Scene modification events
  | 'scene_update'
  | 'scene_regenerate'
  | 'scene_upload'
  | 'scene_reference_update'

  // Bulk operations
  | 'bulk_operation'
  | 'bulk_delete'
  | 'bulk_cancel'
  | 'bulk_retry'

  // System configuration
  | 'settings_updated'
  | 'preset_created'
  | 'preset_updated'
  | 'preset_deleted'

  // File operations
  | 'avatar_upload'
  | 'image_upload'
  | 'file_delete'

  // Rate limiting
  | 'rate_limit_hit'
  | 'rate_limit_exceeded'

  // Worker events
  | 'worker_started'
  | 'worker_failed'
  | 'worker_crashed'

  // Database events
  | 'db_connection_lost'
  | 'db_pool_exhausted'

  // Queue events
  | 'queue_stalled'
  | 'queue_depth_high';

export type ResourceType =
  | 'job'
  | 'scene'
  | 'settings'
  | 'preset'
  | 'file'
  | 'worker'
  | 'database'
  | 'queue';

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'access'
  | 'upload'
  | 'regenerate'
  | 'cancel'
  | 'retry'
  | 'start'
  | 'fail'
  | 'crash';

export interface AuditEvent {
  eventType: AuditEventType;
  severity?: AuditSeverity;
  actor?: string; // IP address or API key hash
  ipAddress?: string;
  userAgent?: string;
  resourceType?: ResourceType;
  resourceId?: string; // UUID
  action?: AuditAction;
  details?: Record<string, any>; // Free-form metadata
}

/**
 * Get default severity for event type
 */
export function getDefaultSeverity(eventType: AuditEventType): AuditSeverity {
  // Critical events
  const criticalEvents: AuditEventType[] = [
    'admin_access_denied',
    'worker_crashed',
    'db_connection_lost',
    'db_pool_exhausted',
  ];

  // Warning events
  const warningEvents: AuditEventType[] = [
    'auth_failed',
    'admin_auth_failed',
    'rate_limit_exceeded',
    'bulk_delete',
    'worker_failed',
    'queue_depth_high',
  ];

  if (criticalEvents.includes(eventType)) return 'critical';
  if (warningEvents.includes(eventType)) return 'warning';
  return 'info';
}

/**
 * Audit Logger Service
 *
 * Centralized service for logging security-sensitive operations
 * to the audit_log table for compliance and forensics.
 *
 * Usage:
 *   await logAuditEvent({
 *     eventType: 'job_delete',
 *     actor: req.headers.get('x-forwarded-for'),
 *     resourceType: 'job',
 *     resourceId: jobId,
 *     action: 'delete',
 *     severity: 'warning',
 *   });
 */

import { pool } from '../db';
import { AuditEvent, getDefaultSeverity } from './audit-types';

/**
 * Log an audit event to the database
 *
 * @param event - Audit event details
 * @returns Promise that resolves when event is logged
 */
export async function logAuditEvent(event: AuditEvent): Promise<void> {
  const {
    eventType,
    severity = getDefaultSeverity(eventType),
    actor,
    ipAddress,
    userAgent,
    resourceType,
    resourceId,
    action,
    details,
  } = event;

  try {
    await pool.query(
      `INSERT INTO audit_log (
        event_type,
        severity,
        actor,
        ip_address,
        user_agent,
        resource_type,
        resource_id,
        action,
        details
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        eventType,
        severity,
        actor || null,
        ipAddress || null,
        userAgent || null,
        resourceType || null,
        resourceId || null,
        action || null,
        details ? JSON.stringify(details) : null,
      ]
    );

    // Log to console for real-time monitoring
    const severityEmoji = severity === 'critical' ? '🚨' : severity === 'warning' ? '⚠️' : 'ℹ️';
    console.log(
      `${severityEmoji} [AUDIT] ${eventType} by ${actor || 'system'} ${
        resourceType ? `on ${resourceType}` : ''
      }${resourceId ? ` ${resourceId}` : ''}`
    );
  } catch (error) {
    // Don't throw errors from audit logging to avoid breaking application flow
    // Just log to console and continue
    console.error('[AUDIT] Failed to log audit event:', error);
    console.error('[AUDIT] Event details:', event);
  }
}

/**
 * Log authentication failure
 */
export async function logAuthFailure(ipAddress: string, userAgent?: string): Promise<void> {
  await logAuditEvent({
    eventType: 'auth_failed',
    severity: 'warning',
    actor: ipAddress,
    ipAddress,
    userAgent,
    action: 'access',
  });
}

/**
 * Log admin endpoint access
 */
export async function logAdminAccess(
  ipAddress: string,
  success: boolean,
  details?: Record<string, any>
): Promise<void> {
  await logAuditEvent({
    eventType: success ? 'admin_access' : 'admin_auth_failed',
    severity: success ? 'info' : 'warning',
    actor: ipAddress,
    ipAddress,
    resourceType: 'settings',
    action: 'access',
    details,
  });
}

/**
 * Log bulk operation
 */
export async function logBulkOperation(
  action: 'delete' | 'cancel' | 'retry',
  count: number,
  ipAddress?: string,
  details?: Record<string, any>
): Promise<void> {
  await logAuditEvent({
    eventType: 'bulk_operation',
    severity: count > 20 ? 'warning' : 'info', // Large bulk operations are warnings
    actor: ipAddress,
    ipAddress,
    resourceType: 'job',
    action,
    details: { count, ...details },
  });
}

/**
 * Log rate limit hit
 */
export async function logRateLimitHit(
  ipAddress: string,
  endpoint: string,
  exceeded: boolean
): Promise<void> {
  await logAuditEvent({
    eventType: exceeded ? 'rate_limit_exceeded' : 'rate_limit_hit',
    severity: exceeded ? 'warning' : 'info',
    actor: ipAddress,
    ipAddress,
    details: { endpoint },
  });
}

/**
 * Query audit log with filters
 *
 * @param options - Query options
 * @returns Array of audit log entries
 */
export async function queryAuditLog(options: {
  limit?: number;
  offset?: number;
  severity?: string;
  eventType?: string;
  actor?: string;
  startDate?: Date;
  endDate?: Date;
  resourceType?: string;
  resourceId?: string;
}): Promise<any[]> {
  const {
    limit = 50,
    offset = 0,
    severity,
    eventType,
    actor,
    startDate,
    endDate,
    resourceType,
    resourceId,
  } = options;

  let query = 'SELECT * FROM audit_log WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;

  if (severity) {
    query += ` AND severity = $${paramIndex}`;
    params.push(severity);
    paramIndex++;
  }

  if (eventType) {
    query += ` AND event_type = $${paramIndex}`;
    params.push(eventType);
    paramIndex++;
  }

  if (actor) {
    query += ` AND actor = $${paramIndex}`;
    params.push(actor);
    paramIndex++;
  }

  if (startDate) {
    query += ` AND timestamp >= $${paramIndex}`;
    params.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    query += ` AND timestamp <= $${paramIndex}`;
    params.push(endDate);
    paramIndex++;
  }

  if (resourceType) {
    query += ` AND resource_type = $${paramIndex}`;
    params.push(resourceType);
    paramIndex++;
  }

  if (resourceId) {
    query += ` AND resource_id = $${paramIndex}`;
    params.push(resourceId);
    paramIndex++;
  }

  query += ` ORDER BY timestamp DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);
  return result.rows;
}

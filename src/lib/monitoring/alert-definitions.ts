/**
 * Alert Rule Definitions
 *
 * Defines alerting rules for production monitoring.
 * Each rule specifies a condition to check and a message template.
 *
 * Phase 8: Monitoring & Observability - Alert Service
 */

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  condition: (metrics: any) => boolean;
  message: (metrics: any) => string;
  enabled: boolean;
}

export const alertRules: AlertRule[] = [
  // Worker Health Alerts
  {
    id: 'worker_crash',
    name: 'Worker Crash Detected',
    description: 'BullMQ worker crashed unexpectedly',
    severity: 'critical',
    enabled: true,
    condition: (event) =>
      event.type === 'worker_failed' && event.error?.includes('crash'),
    message: (event) =>
      `Worker ${event.workerName} crashed: ${event.error}`,
  },
  {
    id: 'worker_stalled',
    name: 'Worker Stalled',
    description: 'Worker is not processing jobs (stalled)',
    severity: 'warning',
    enabled: true,
    condition: (event) =>
      event.type === 'worker_stalled',
    message: (event) =>
      `Worker ${event.workerName} has stalled (no progress in 60s)`,
  },

  // Queue Health Alerts
  {
    id: 'queue_depth_high',
    name: 'High Queue Depth',
    description: 'Queue has >10 pending jobs',
    severity: 'warning',
    enabled: true,
    condition: (metrics) => metrics.queueDepth > 10,
    message: (metrics) =>
      `Queue depth: ${metrics.queueDepth} jobs pending (threshold: 10)`,
  },
  {
    id: 'queue_depth_critical',
    name: 'Critical Queue Depth',
    description: 'Queue has >50 pending jobs',
    severity: 'critical',
    enabled: true,
    condition: (metrics) => metrics.queueDepth > 50,
    message: (metrics) =>
      `Queue depth CRITICAL: ${metrics.queueDepth} jobs pending (threshold: 50)`,
  },

  // Database Alerts
  {
    id: 'db_pool_exhausted',
    name: 'Database Pool Exhausted',
    description: 'Connection pool has waiting connections',
    severity: 'critical',
    enabled: true,
    condition: (metrics) =>
      metrics.connectionPool && metrics.connectionPool.waiting > 0,
    message: (metrics) =>
      `Database pool exhausted: ${metrics.connectionPool.waiting} connections waiting (total: ${metrics.connectionPool.total})`,
  },
  {
    id: 'db_pool_high_utilization',
    name: 'High Database Pool Utilization',
    description: 'Connection pool >80% utilized',
    severity: 'warning',
    enabled: true,
    condition: (metrics) =>
      metrics.connectionPool &&
      metrics.connectionPool.utilization > 80,
    message: (metrics) =>
      `Database pool utilization high: ${metrics.connectionPool.utilization}% (threshold: 80%)`,
  },

  // Authentication Alerts
  {
    id: 'auth_failures',
    name: 'Multiple Authentication Failures',
    description: '>5 auth failures in 1 minute from same IP',
    severity: 'warning',
    enabled: true,
    condition: (metrics) => metrics.authFailures > 5,
    message: (metrics) =>
      `${metrics.authFailures} authentication failures from ${metrics.ip} in last minute`,
  },
  {
    id: 'admin_access_denied',
    name: 'Admin Access Denied',
    description: 'Admin endpoint access denied (wrong key or IP)',
    severity: 'warning',
    enabled: true,
    condition: (event) =>
      event.type === 'admin_access_denied',
    message: (event) =>
      `Admin access denied for ${event.ip} (reason: ${event.reason})`,
  },

  // System Resource Alerts
  {
    id: 'disk_space_low',
    name: 'Low Disk Space',
    description: '<10% disk space remaining',
    severity: 'critical',
    enabled: true,
    condition: (metrics) => metrics.diskUsagePercent > 90,
    message: (metrics) =>
      `Disk usage critical: ${metrics.diskUsagePercent}% used (${metrics.diskFree} GB free)`,
  },
  {
    id: 'disk_space_warning',
    name: 'Disk Space Warning',
    description: '<20% disk space remaining',
    severity: 'warning',
    enabled: true,
    condition: (metrics) =>
      metrics.diskUsagePercent > 80 && metrics.diskUsagePercent <= 90,
    message: (metrics) =>
      `Disk usage warning: ${metrics.diskUsagePercent}% used (${metrics.diskFree} GB free)`,
  },

  // Job Processing Alerts
  {
    id: 'bulk_delete_large',
    name: 'Large Bulk Delete Operation',
    description: '>20 jobs deleted in single operation',
    severity: 'warning',
    enabled: true,
    condition: (event) =>
      event.type === 'bulk_operation' &&
      event.action === 'delete' &&
      event.count > 20,
    message: (event) =>
      `Large bulk delete: ${event.count} jobs deleted by ${event.actor}`,
  },
  {
    id: 'render_timeout',
    name: 'Render Timeout',
    description: 'Video render exceeded timeout',
    severity: 'warning',
    enabled: true,
    condition: (event) =>
      event.type === 'render_failed' &&
      event.error?.includes('timeout'),
    message: (event) =>
      `Render timeout for job ${event.jobId} (duration: ${event.duration}s)`,
  },
  {
    id: 'image_generation_failures',
    name: 'Multiple Image Generation Failures',
    description: '>5 image generation failures in 10 minutes',
    severity: 'warning',
    enabled: true,
    condition: (metrics) =>
      metrics.imageFailuresLast10Min > 5,
    message: (metrics) =>
      `${metrics.imageFailuresLast10Min} image generation failures in last 10 minutes`,
  },

  // Rate Limiting Alerts
  {
    id: 'rate_limit_threshold',
    name: 'High Rate Limit Hits',
    description: '>10 rate limit violations in 5 minutes',
    severity: 'warning',
    enabled: true,
    condition: (metrics) => metrics.rateLimitHitsLast5Min > 10,
    message: (metrics) =>
      `${metrics.rateLimitHitsLast5Min} rate limit hits in last 5 minutes`,
  },
];

/**
 * Get all enabled alert rules
 */
export function getEnabledRules(): AlertRule[] {
  return alertRules.filter((rule) => rule.enabled);
}

/**
 * Get alert rules by severity
 */
export function getRulesBySeverity(
  severity: 'info' | 'warning' | 'critical'
): AlertRule[] {
  return alertRules.filter(
    (rule) => rule.enabled && rule.severity === severity
  );
}

/**
 * Get alert rule by ID
 */
export function getRuleById(id: string): AlertRule | undefined {
  return alertRules.find((rule) => rule.id === id);
}

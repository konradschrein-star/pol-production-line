/**
 * Alert Service
 *
 * Dispatches alerts based on defined rules.
 * Phase 8: Console-only alerts.
 * Future phases: Email, Slack, webhook integrations.
 *
 * Phase 8: Monitoring & Observability - Alert Service
 */

import { AlertRule, getEnabledRules } from './alert-definitions';
import { logAuditEvent } from '../security/audit-logger';

interface AlertDispatchOptions {
  logToAudit?: boolean; // Whether to log alert to audit_log table
  metadata?: any; // Additional context for alert
}

/**
 * Alert Service
 *
 * Responsible for checking alert conditions and dispatching notifications.
 */
export class AlertService {
  private static lastAlertTimes: Map<string, number> = new Map();
  private static readonly ALERT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Dispatch a single alert
   *
   * @param rule - Alert rule that was triggered
   * @param metrics - Metrics that triggered the alert
   * @param options - Dispatch options
   */
  static dispatch(
    rule: AlertRule,
    metrics: any,
    options: AlertDispatchOptions = {}
  ): void {
    // Check cooldown to avoid alert fatigue
    const now = Date.now();
    const lastAlertTime = this.lastAlertTimes.get(rule.id) || 0;
    const timeSinceLastAlert = now - lastAlertTime;

    if (timeSinceLastAlert < this.ALERT_COOLDOWN_MS) {
      // Skip dispatch - alert was sent recently
      return;
    }

    // Generate alert message
    const message = rule.message(metrics);

    // Console dispatch (Phase 8)
    this.dispatchToConsole(rule, message);

    // Update last alert time
    this.lastAlertTimes.set(rule.id, now);

    // Optional: Log to audit_log
    if (options.logToAudit) {
      this.logToAudit(rule, message, metrics, options.metadata);
    }

    // Future: Email, Slack, webhook dispatches
    // await this.dispatchToEmail(rule, message);
    // await this.dispatchToSlack(rule, message);
  }

  /**
   * Dispatch alert to console
   *
   * @param rule - Alert rule
   * @param message - Alert message
   */
  private static dispatchToConsole(rule: AlertRule, message: string): void {
    const timestamp = new Date().toISOString();

    switch (rule.severity) {
      case 'critical':
        console.error(
          `🚨 [CRITICAL] ${timestamp} [${rule.id}] ${rule.name}: ${message}`
        );
        break;
      case 'warning':
        console.warn(
          `⚠️  [WARNING] ${timestamp} [${rule.id}] ${rule.name}: ${message}`
        );
        break;
      case 'info':
        console.info(
          `ℹ️  [INFO] ${timestamp} [${rule.id}] ${rule.name}: ${message}`
        );
        break;
    }
  }

  /**
   * Log alert to audit_log table
   *
   * @param rule - Alert rule
   * @param message - Alert message
   * @param metrics - Metrics that triggered alert
   * @param metadata - Additional metadata
   */
  private static async logToAudit(
    rule: AlertRule,
    message: string,
    metrics: any,
    metadata?: any
  ): Promise<void> {
    try {
      await logAuditEvent({
        eventType: 'alert_triggered',
        actor: 'system',
        action: rule.id,
        severity: rule.severity,
        details: {
          ruleName: rule.name,
          message,
          metrics,
          ...metadata,
        },
      });
    } catch (error) {
      console.error('❌ [ALERT SERVICE] Failed to log alert to audit:', error);
    }
  }

  /**
   * Check all enabled alert rules against provided metrics
   *
   * @param metrics - Current system metrics
   * @param options - Dispatch options (applied to all triggered alerts)
   */
  static checkAll(metrics: any, options: AlertDispatchOptions = {}): void {
    const enabledRules = getEnabledRules();

    for (const rule of enabledRules) {
      try {
        if (rule.condition(metrics)) {
          this.dispatch(rule, metrics, options);
        }
      } catch (error) {
        console.error(
          `❌ [ALERT SERVICE] Error checking rule ${rule.id}:`,
          error
        );
      }
    }
  }

  /**
   * Check specific alert rule
   *
   * @param ruleId - Alert rule ID
   * @param metrics - Current system metrics
   * @param options - Dispatch options
   */
  static checkRule(
    ruleId: string,
    metrics: any,
    options: AlertDispatchOptions = {}
  ): void {
    const rules = getEnabledRules();
    const rule = rules.find((r) => r.id === ruleId);

    if (!rule) {
      console.warn(`⚠️  [ALERT SERVICE] Rule not found: ${ruleId}`);
      return;
    }

    try {
      if (rule.condition(metrics)) {
        this.dispatch(rule, metrics, options);
      }
    } catch (error) {
      console.error(
        `❌ [ALERT SERVICE] Error checking rule ${ruleId}:`,
        error
      );
    }
  }

  /**
   * Reset alert cooldown for a specific rule (for testing)
   *
   * @param ruleId - Alert rule ID
   */
  static resetCooldown(ruleId: string): void {
    this.lastAlertTimes.delete(ruleId);
  }

  /**
   * Reset all alert cooldowns (for testing)
   */
  static resetAllCooldowns(): void {
    this.lastAlertTimes.clear();
  }

  /**
   * Get time since last alert for a rule
   *
   * @param ruleId - Alert rule ID
   * @returns Time in milliseconds since last alert, or null if never alerted
   */
  static getTimeSinceLastAlert(ruleId: string): number | null {
    const lastAlertTime = this.lastAlertTimes.get(ruleId);
    if (!lastAlertTime) return null;
    return Date.now() - lastAlertTime;
  }
}

/**
 * Helper function: Check worker health and trigger alerts
 *
 * Usage in BullMQ worker files:
 * ```typescript
 * import { checkWorkerHealth } from '@/lib/monitoring/alert-service';
 *
 * worker.on('failed', (job, error) => {
 *   checkWorkerHealth({
 *     type: 'worker_failed',
 *     workerName: 'analyze.worker',
 *     error: error.message,
 *   });
 * });
 * ```
 */
export function checkWorkerHealth(event: any): void {
  AlertService.checkAll(event, { logToAudit: true });
}

/**
 * Helper function: Check queue health and trigger alerts
 *
 * Usage in health check endpoint:
 * ```typescript
 * import { checkQueueHealth } from '@/lib/monitoring/alert-service';
 *
 * const queueDepth = await getQueueDepth();
 * checkQueueHealth({ queueDepth });
 * ```
 */
export function checkQueueHealth(metrics: {
  queueDepth: number;
}): void {
  AlertService.checkAll(metrics, { logToAudit: false });
}

/**
 * Helper function: Check database health and trigger alerts
 *
 * Usage in health check endpoint:
 * ```typescript
 * import { checkDatabaseHealth } from '@/lib/monitoring/alert-service';
 *
 * const poolStats = pool.getPoolStats();
 * checkDatabaseHealth({
 *   connectionPool: {
 *     total: poolStats.total,
 *     idle: poolStats.idle,
 *     waiting: poolStats.waiting,
 *     utilization: Math.round((poolStats.total - poolStats.idle) / poolStats.total * 100),
 *   },
 * });
 * ```
 */
export function checkDatabaseHealth(metrics: {
  connectionPool: {
    total: number;
    idle: number;
    waiting: number;
    utilization: number;
  };
}): void {
  AlertService.checkAll(metrics, { logToAudit: true });
}

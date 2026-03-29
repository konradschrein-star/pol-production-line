/**
 * Notification System for Error Tracking and User Alerts
 *
 * Provides persistent notifications for:
 * - Image generation failures
 * - Token refresh issues
 * - Rendering errors
 * - System warnings
 */

import { db } from '../db';

export interface Notification {
  id: string;
  job_id: string;
  scene_id?: string;
  severity: 'info' | 'warning' | 'error';
  category: string; // 'image_generation', 'token_refresh', 'rendering', 'system'
  message: string;
  details?: any;
  created_at: Date;
  read: boolean;
}

/**
 * Create a new notification
 *
 * @param data Notification data (id, created_at, read will be auto-generated)
 * @returns Created notification ID
 */
export async function createNotification(
  data: Omit<Notification, 'id' | 'created_at' | 'read'>
): Promise<string> {
  try {
    const result = await db.query(
      `INSERT INTO notifications (job_id, scene_id, severity, category, message, details)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        data.job_id,
        data.scene_id || null,
        data.severity,
        data.category,
        data.message,
        data.details ? JSON.stringify(data.details) : null
      ]
    );

    const notificationId = result.rows[0].id;
    console.log(`📢 [Notifications] Created ${data.severity} notification: ${data.message}`);

    return notificationId;

  } catch (error) {
    // Fallback to console if database unavailable
    console.error('[Notifications] Failed to create notification (database error):', error);
    console.error('[Notifications] Original notification:', data);
    throw error;
  }
}

/**
 * Get unread notifications
 *
 * @param limit Maximum number of notifications to return (default: 10)
 * @returns Array of unread notifications, sorted by most recent first
 */
export async function getUnreadNotifications(limit: number = 10): Promise<Notification[]> {
  try {
    const result = await db.query(
      `SELECT * FROM notifications
       WHERE read = false
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows;

  } catch (error) {
    console.error('[Notifications] Failed to fetch unread notifications:', error);
    return [];
  }
}

/**
 * Get all notifications for a specific job
 *
 * @param jobId Job ID to filter by
 * @param limit Maximum number of notifications to return (default: 50)
 * @returns Array of notifications for the job
 */
export async function getJobNotifications(jobId: string, limit: number = 50): Promise<Notification[]> {
  try {
    const result = await db.query(
      `SELECT * FROM notifications
       WHERE job_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [jobId, limit]
    );

    return result.rows;

  } catch (error) {
    console.error('[Notifications] Failed to fetch job notifications:', error);
    return [];
  }
}

/**
 * Mark notifications as read
 *
 * @param notificationIds Array of notification IDs to mark as read
 * @returns Number of notifications marked as read
 */
export async function markNotificationsAsRead(notificationIds: string[]): Promise<number> {
  try {
    const result = await db.query(
      `UPDATE notifications
       SET read = true
       WHERE id = ANY($1)
       RETURNING id`,
      [notificationIds]
    );

    console.log(`📖 [Notifications] Marked ${result.rowCount} notifications as read`);
    return result.rowCount || 0;

  } catch (error) {
    console.error('[Notifications] Failed to mark notifications as read:', error);
    return 0;
  }
}

/**
 * Delete old read notifications
 *
 * @param daysOld Delete notifications older than this many days (default: 7)
 * @returns Number of notifications deleted
 */
export async function cleanupOldNotifications(daysOld: number = 7): Promise<number> {
  try {
    const result = await db.query(
      `DELETE FROM notifications
       WHERE read = true
       AND created_at < NOW() - INTERVAL '${daysOld} days'
       RETURNING id`
    );

    console.log(`🧹 [Notifications] Cleaned up ${result.rowCount} old notifications`);
    return result.rowCount || 0;

  } catch (error) {
    console.error('[Notifications] Failed to cleanup old notifications:', error);
    return 0;
  }
}

/**
 * Get notification count by severity
 *
 * @returns Object with counts for each severity level
 */
export async function getNotificationCounts(): Promise<{
  total: number;
  unread: number;
  error: number;
  warning: number;
  info: number;
}> {
  try {
    const result = await db.query(
      `SELECT
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE read = false) as unread,
         COUNT(*) FILTER (WHERE severity = 'error' AND read = false) as error,
         COUNT(*) FILTER (WHERE severity = 'warning' AND read = false) as warning,
         COUNT(*) FILTER (WHERE severity = 'info' AND read = false) as info
       FROM notifications`
    );

    return {
      total: parseInt(result.rows[0].total),
      unread: parseInt(result.rows[0].unread),
      error: parseInt(result.rows[0].error),
      warning: parseInt(result.rows[0].warning),
      info: parseInt(result.rows[0].info),
    };

  } catch (error) {
    console.error('[Notifications] Failed to get notification counts:', error);
    return { total: 0, unread: 0, error: 0, warning: 0, info: 0 };
  }
}

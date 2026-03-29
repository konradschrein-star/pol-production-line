/**
 * Notifications API Endpoint
 *
 * GET /api/notifications - Get notifications (optionally filter by unread status)
 * PATCH /api/notifications - Mark notifications as read
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/notifications
 *
 * Query parameters:
 * - unread: boolean (optional) - Only return unread notifications
 * - limit: number (optional) - Max number of notifications (default: 50)
 * - jobId: string (optional) - Filter by job ID
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    const jobId = searchParams.get('jobId');

    let query = 'SELECT * FROM notifications WHERE 1=1';
    const params: any[] = [];

    if (unreadOnly) {
      query += ' AND read = false';
    }

    if (jobId) {
      params.push(jobId);
      query += ` AND job_id = $${params.length}`;
    }

    params.push(limit);
    query += ` ORDER BY created_at DESC LIMIT $${params.length}`;

    const result = await db.query(query, params);

    // Also get counts
    const countQuery = `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE read = false) as unread,
        COUNT(*) FILTER (WHERE severity = 'error' AND read = false) as error,
        COUNT(*) FILTER (WHERE severity = 'warning' AND read = false) as warning,
        COUNT(*) FILTER (WHERE severity = 'info' AND read = false) as info
      FROM notifications
    `;
    const countResult = await db.query(countQuery);

    return NextResponse.json({
      notifications: result.rows,
      counts: {
        total: parseInt(countResult.rows[0].total),
        unread: parseInt(countResult.rows[0].unread),
        error: parseInt(countResult.rows[0].error),
        warning: parseInt(countResult.rows[0].warning),
        info: parseInt(countResult.rows[0].info),
      }
    });

  } catch (error) {
    console.error('[API] Failed to fetch notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications
 *
 * Mark notifications as read
 * Body: { notificationIds: string[] }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { notificationIds } = body;

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json(
        { error: 'notificationIds array is required' },
        { status: 400 }
      );
    }

    const result = await db.query(
      'UPDATE notifications SET read = true WHERE id = ANY($1) RETURNING id',
      [notificationIds]
    );

    return NextResponse.json({
      success: true,
      markedAsRead: result.rowCount || 0
    });

  } catch (error) {
    console.error('[API] Failed to mark notifications as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark notifications as read' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications
 *
 * Delete old read notifications
 * Query parameters:
 * - daysOld: number (optional) - Delete notifications older than this many days (default: 7)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const daysOld = parseInt(searchParams.get('daysOld') || '7');

    const result = await db.query(
      `DELETE FROM notifications
       WHERE read = true
       AND created_at < NOW() - INTERVAL '${daysOld} days'
       RETURNING id`
    );

    return NextResponse.json({
      success: true,
      deleted: result.rowCount || 0
    });

  } catch (error) {
    console.error('[API] Failed to delete old notifications:', error);
    return NextResponse.json(
      { error: 'Failed to delete old notifications' },
      { status: 500 }
    );
  }
}

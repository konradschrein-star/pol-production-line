/**
 * Security Events API
 *
 * Provides access to audit log events for security monitoring dashboard.
 * Admin-only endpoint for viewing authentication failures, bulk operations,
 * rate limit violations, and other security-sensitive events.
 *
 * Phase 8: Monitoring & Observability - Security Event Monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 500); // Max 500 events
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);
    const severity = searchParams.get('severity'); // 'critical', 'warning', 'info'
    const eventType = searchParams.get('event_type');
    const timeRange = searchParams.get('range') || '24h'; // 24h, 7d, 30d

    // Calculate time interval
    const interval =
      timeRange === '24h' ? '24 hours' :
      timeRange === '7d' ? '7 days' :
      timeRange === '30d' ? '30 days' :
      '24 hours';

    // Build query with filters
    let query = `
      SELECT
        id,
        timestamp,
        event_type,
        actor,
        resource_type,
        resource_id,
        action,
        details,
        severity,
        ip_address,
        user_agent
      FROM audit_log
      WHERE timestamp > NOW() - INTERVAL '${interval}'
    `;

    const queryParams: any[] = [];
    let paramIndex = 1;

    if (severity) {
      query += ` AND severity = $${paramIndex}`;
      queryParams.push(severity);
      paramIndex++;
    }

    if (eventType) {
      query += ` AND event_type = $${paramIndex}`;
      queryParams.push(eventType);
      paramIndex++;
    }

    query += ` ORDER BY timestamp DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    const result = await pool.query(query, queryParams);

    // Query for event type counts (for filters)
    const eventTypeCounts = await pool.query(
      `SELECT event_type, COUNT(*) as count
       FROM audit_log
       WHERE timestamp > NOW() - INTERVAL '${interval}'
       GROUP BY event_type
       ORDER BY count DESC`
    );

    // Query for severity counts
    const severityCounts = await pool.query(
      `SELECT severity, COUNT(*) as count
       FROM audit_log
       WHERE timestamp > NOW() - INTERVAL '${interval}'
       GROUP BY severity
       ORDER BY count DESC`
    );

    // Query for recent critical events (for threat indicators)
    const criticalEvents = await pool.query(
      `SELECT event_type, COUNT(*) as count
       FROM audit_log
       WHERE timestamp > NOW() - INTERVAL '1 hour'
         AND severity = 'critical'
       GROUP BY event_type
       ORDER BY count DESC
       LIMIT 5`
    );

    return NextResponse.json({
      events: result.rows,
      total: result.rowCount,
      pagination: {
        limit,
        offset,
        hasMore: result.rowCount === limit,
      },
      filters: {
        eventTypes: eventTypeCounts.rows,
        severities: severityCounts.rows,
      },
      alerts: {
        criticalEventsLastHour: criticalEvents.rows,
        totalCriticalLastHour: criticalEvents.rows.reduce((sum, e) => sum + parseInt(e.count), 0),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ [SECURITY EVENTS API] Error fetching events:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to fetch security events',
      },
      { status: 500 }
    );
  }
}

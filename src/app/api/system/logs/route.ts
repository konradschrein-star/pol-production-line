/**
 * System Logs API Endpoint
 *
 * GET /api/system/logs - Query structured logs with filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/system/logs
 *
 * Query parameters:
 * - level: string (optional) - Filter by log level (debug, info, warn, error, critical)
 * - category: string (optional) - Filter by category (image_generation, token_refresh, etc.)
 * - jobId: string (optional) - Filter by job ID
 * - sceneId: string (optional) - Filter by scene ID
 * - limit: number (optional) - Max number of logs (default: 100, max: 1000)
 * - offset: number (optional) - Pagination offset (default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level');
    const category = searchParams.get('category');
    const jobId = searchParams.get('jobId');
    const sceneId = searchParams.get('sceneId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000);
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = 'SELECT * FROM system_logs WHERE 1=1';
    const params: any[] = [];

    if (level) {
      params.push(level);
      query += ` AND level = $${params.length}`;
    }

    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }

    if (jobId) {
      params.push(jobId);
      query += ` AND job_id = $${params.length}`;
    }

    if (sceneId) {
      params.push(sceneId);
      query += ` AND scene_id = $${params.length}`;
    }

    // Order by most recent first
    query += ' ORDER BY timestamp DESC';

    // Add pagination
    params.push(limit, offset);
    query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await db.query(query, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM system_logs WHERE 1=1';
    const countParams: any[] = [];

    if (level) {
      countParams.push(level);
      countQuery += ` AND level = $${countParams.length}`;
    }

    if (category) {
      countParams.push(category);
      countQuery += ` AND category = $${countParams.length}`;
    }

    if (jobId) {
      countParams.push(jobId);
      countQuery += ` AND job_id = $${countParams.length}`;
    }

    if (sceneId) {
      countParams.push(sceneId);
      countQuery += ` AND scene_id = $${countParams.length}`;
    }

    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    return NextResponse.json({
      logs: result.rows,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      }
    });

  } catch (error) {
    console.error('[API] Failed to fetch system logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system logs' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/system/logs
 *
 * Delete old logs
 * Query parameters:
 * - daysOld: number (optional) - Delete logs older than this many days (default: 7)
 * - level: string (optional) - Only delete logs of this level (e.g., 'debug', 'info')
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const daysOld = parseInt(searchParams.get('daysOld') || '7');
    const level = searchParams.get('level');

    let query = `DELETE FROM system_logs WHERE timestamp < NOW() - INTERVAL '${daysOld} days'`;
    const params: any[] = [];

    if (level) {
      params.push(level);
      query += ` AND level = $${params.length}`;
    }

    query += ' RETURNING id';

    const result = await db.query(query, params);

    return NextResponse.json({
      success: true,
      deleted: result.rowCount || 0
    });

  } catch (error) {
    console.error('[API] Failed to delete old logs:', error);
    return NextResponse.json(
      { error: 'Failed to delete old logs' },
      { status: 500 }
    );
  }
}

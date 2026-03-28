/**
 * Audit Log API Route
 *
 * Query audit log entries (admin-only).
 *
 * GET /api/audit?limit=50&severity=critical&eventType=auth_failed
 *
 * Query Parameters:
 * - limit: Number of entries to return (default: 50, max: 500)
 * - offset: Pagination offset (default: 0)
 * - severity: Filter by severity (info, warning, critical)
 * - eventType: Filter by event type
 * - actor: Filter by actor (IP address)
 * - startDate: Filter by start date (ISO 8601)
 * - endDate: Filter by end date (ISO 8601)
 * - resourceType: Filter by resource type
 * - resourceId: Filter by resource ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryAuditLog } from '@/lib/security/audit-logger';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  // Admin authentication check
  const adminKey = req.headers.get('x-admin-api-key');
  const validAdminKey = process.env.ADMIN_API_KEY;

  if (!adminKey || !validAdminKey) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Admin API key required' },
      { status: 401 }
    );
  }

  // Timing-safe comparison
  try {
    const providedBuffer = Buffer.from(adminKey, 'utf-8');
    const validBuffer = Buffer.from(validAdminKey, 'utf-8');

    if (
      providedBuffer.length !== validBuffer.length ||
      !crypto.timingSafeEqual(providedBuffer, validBuffer)
    ) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid admin API key' },
        { status: 401 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Authentication error' },
      { status: 401 }
    );
  }

  // Parse query parameters
  const { searchParams } = req.nextUrl;

  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 500);
  const offset = parseInt(searchParams.get('offset') || '0');
  const severity = searchParams.get('severity') || undefined;
  const eventType = searchParams.get('eventType') || undefined;
  const actor = searchParams.get('actor') || undefined;
  const resourceType = searchParams.get('resourceType') || undefined;
  const resourceId = searchParams.get('resourceId') || undefined;

  const startDateStr = searchParams.get('startDate');
  const endDateStr = searchParams.get('endDate');

  const startDate = startDateStr ? new Date(startDateStr) : undefined;
  const endDate = endDateStr ? new Date(endDateStr) : undefined;

  try {
    // Query audit log
    const events = await queryAuditLog({
      limit,
      offset,
      severity,
      eventType,
      actor,
      startDate,
      endDate,
      resourceType,
      resourceId,
    });

    return NextResponse.json({
      events,
      total: events.length,
      limit,
      offset,
      filters: {
        severity,
        eventType,
        actor,
        startDate: startDateStr,
        endDate: endDateStr,
        resourceType,
        resourceId,
      },
    });
  } catch (error) {
    console.error('[AUDIT API] Error querying audit log:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to query audit log' },
      { status: 500 }
    );
  }
}

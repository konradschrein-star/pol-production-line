/**
 * GET /api/jobs - List jobs with pagination and filtering
 * PRODUCTION HARDENING Phase 2: Added Zod validation and error sanitization
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { jobFilterSchema, validateQuery, formatValidationErrors } from '@/lib/validation/schemas';
import { sanitizeError, getErrorStatusCode } from '@/lib/errors/safe-errors';
import { z } from 'zod';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // PRODUCTION HARDENING: Validate query parameters with Zod
    // Convert null to undefined for optional fields
    const queryParams = validateQuery(jobFilterSchema, {
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      sort_by: searchParams.get('sortBy') ?? undefined,
      sort_order: searchParams.get('sortOrder') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      search: searchParams.get('search') ?? undefined,
    });

    const { page, limit, sort_by, sort_order, status, search } = queryParams;

    // Build WHERE conditions
    let whereConditions = '1=1';
    const params: any[] = [];
    let paramIndex = 1;

    // Status filter
    if (status && status !== 'all') {
      whereConditions += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Search filter (full-text search)
    if (search && search.trim()) {
      whereConditions += ` AND (
        to_tsvector('english', raw_script || ' ' || COALESCE(avatar_script, ''))
        @@ plainto_tsquery('english', $${paramIndex})
        OR id::text ILIKE $${paramIndex + 1}
      )`;
      params.push(search);
      params.push(`%${search}%`);
      paramIndex += 2;
    }

    // Count total for pagination
    const countResult = await db.query(
      `SELECT COUNT(*) FROM news_jobs WHERE ${whereConditions}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Build main query with sorting (already validated by Zod)
    // Join with news_scenes to get scene counts for progress calculation
    let query = `
      SELECT
        j.*,
        COUNT(s.id) AS total_scenes,
        COUNT(s.image_url) AS completed_scenes
      FROM news_jobs j
      LEFT JOIN news_scenes s ON j.id = s.job_id
      WHERE ${whereConditions}
      GROUP BY j.id
      ORDER BY j.${sort_by} ${sort_order.toUpperCase()}
    `;

    // Add pagination
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, (page - 1) * limit);

    // Execute query
    const result = await db.query(query, params);

    // Convert scene counts from strings to numbers
    const jobs = result.rows.map(row => ({
      ...row,
      total_scenes: parseInt(row.total_scenes) || 0,
      completed_scenes: parseInt(row.completed_scenes) || 0,
    }));

    return NextResponse.json({
      jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    // PRODUCTION HARDENING: Handle validation errors and sanitize responses
    if (error instanceof z.ZodError) {
      return NextResponse.json(formatValidationErrors(error), { status: 400 });
    }

    // Log full error server-side
    console.error('[API] Failed to fetch jobs:', error);

    // Return sanitized error to client
    return NextResponse.json(
      { error: sanitizeError(error) },
      { status: getErrorStatusCode(error) }
    );
  }
}

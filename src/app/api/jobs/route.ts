/**
 * GET /api/jobs - List jobs with pagination and filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build query
    let query = 'SELECT * FROM news_jobs WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    // Status filter
    if (status && status !== 'all') {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Search filter (full-text search)
    if (search && search.trim()) {
      query += ` AND (
        to_tsvector('english', raw_script || ' ' || COALESCE(avatar_script, ''))
        @@ plainto_tsquery('english', $${paramIndex})
        OR id::text ILIKE $${paramIndex + 1}
      )`;
      params.push(search);
      params.push(`%${search}%`);
      paramIndex += 2;
    }

    // Validate and apply sorting
    const allowedSortColumns = ['created_at', 'updated_at', 'status', 'id'];
    const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    query += ` ORDER BY ${safeSortBy} ${safeSortOrder}`;

    // Count total for pagination
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Add pagination
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, (page - 1) * limit);

    // Execute query
    const result = await db.query(query, params);

    return NextResponse.json({
      jobs: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Failed to fetch jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}

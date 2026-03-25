import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cancelJobQueues } from '@/lib/queue/cleanup';
import { jobIdParamsSchema, updateJobSchema, validateParams, validateBody, formatValidationErrors } from '@/lib/validation/schemas';
import { sanitizeError, getErrorStatusCode } from '@/lib/errors/safe-errors';
import { z } from 'zod';

/**
 * GET /api/jobs/[id]
 * Fetch job with all scenes
 * PRODUCTION HARDENING Phase 2: Added UUID validation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // PRODUCTION HARDENING: Validate UUID parameter
    const { id } = validateParams(jobIdParamsSchema, params);

    console.log(`📋 [API] Fetching job ${id}...`);

    // Fetch job
    const jobResult = await db.query(
      'SELECT * FROM news_jobs WHERE id = $1',
      [id]
    );

    if (jobResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    const job = jobResult.rows[0];

    // Fetch scenes
    const scenesResult = await db.query(
      'SELECT * FROM news_scenes WHERE job_id = $1 ORDER BY scene_order',
      [id]
    );

    const scenes = scenesResult.rows;

    console.log(`✅ [API] Job ${id} fetched: ${scenes.length} scenes`);

    return NextResponse.json({
      success: true,
      job,
      scenes,
    });

  } catch (error: unknown) {
    // PRODUCTION HARDENING: Handle validation errors and sanitize responses
    if (error instanceof z.ZodError) {
      return NextResponse.json(formatValidationErrors(error), { status: 400 });
    }

    console.error('[API] Error fetching job:', error);

    return NextResponse.json(
      { error: sanitizeError(error) },
      { status: getErrorStatusCode(error) }
    );
  }
}

/**
 * DELETE /api/jobs/[id]
 * Hard delete job with queue cleanup
 * PRODUCTION HARDENING Phase 2: Added UUID validation
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // PRODUCTION HARDENING: Validate UUID parameter
    const { id } = validateParams(jobIdParamsSchema, params);

    console.log(`🗑️ [API] Deleting job ${id}...`);

    // Fetch job to determine current state
    const jobResult = await db.query(
      'SELECT * FROM news_jobs WHERE id = $1',
      [id]
    );

    if (jobResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    const job = jobResult.rows[0];

    // Cancel any active queue jobs
    const cleanupResult = await cancelJobQueues(id, job.status);

    console.log(`🧹 [API] Queue cleanup result:`, cleanupResult);

    // Hard delete (cascades to news_scenes via ON DELETE CASCADE)
    await db.query('DELETE FROM news_jobs WHERE id = $1', [id]);

    console.log(`✅ [API] Job ${id} deleted successfully`);

    return NextResponse.json({
      success: true,
      cleanup: cleanupResult
    });

  } catch (error: unknown) {
    // PRODUCTION HARDENING: Handle validation errors and sanitize responses
    if (error instanceof z.ZodError) {
      return NextResponse.json(formatValidationErrors(error), { status: 400 });
    }

    console.error('[API] Delete job error:', error);

    return NextResponse.json(
      { error: sanitizeError(error) },
      { status: getErrorStatusCode(error) }
    );
  }
}

/**
 * PATCH /api/jobs/[id]
 * Edit job script (only allowed in pending or failed states)
 * PRODUCTION HARDENING Phase 2: Added UUID and body validation
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // PRODUCTION HARDENING: Validate UUID parameter
    const { id } = validateParams(jobIdParamsSchema, params);

    // PRODUCTION HARDENING: Validate request body
    const body = await request.json();
    const validatedBody = await validateBody(updateJobSchema, body);
    const { raw_script } = validatedBody;

    console.log(`✏️ [API] Editing job ${id}...`);

    // Ensure raw_script is provided (optional in schema, but required for PATCH)
    if (!raw_script) {
      return NextResponse.json(
        { error: 'raw_script is required for job updates' },
        { status: 400 }
      );
    }

    // Fetch job to check status
    const jobResult = await db.query(
      'SELECT status FROM news_jobs WHERE id = $1',
      [id]
    );

    if (jobResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    const status = jobResult.rows[0].status;

    // Only allow editing in pending or failed states
    if (!['pending', 'failed'].includes(status)) {
      return NextResponse.json(
        { error: 'Can only edit scripts in pending or failed state' },
        { status: 400 }
      );
    }

    // Update script and reset job - use transaction for data consistency
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // Update script and reset to pending
      await client.query(
        `UPDATE news_jobs
         SET raw_script = $1,
             status = 'pending',
             error_message = NULL,
             updated_at = NOW()
         WHERE id = $2`,
        [raw_script, id]
      );

      // Delete any existing analysis artifacts
      await client.query(
        `UPDATE news_jobs
         SET avatar_script = NULL,
             avatar_mp4_url = NULL,
             avatar_duration_seconds = NULL
         WHERE id = $1`,
        [id]
      );

      // Delete all scenes for this job
      await client.query(
        'DELETE FROM news_scenes WHERE job_id = $1',
        [id]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    console.log(`✅ [API] Job ${id} script updated and reset to pending`);

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    // PRODUCTION HARDENING: Handle validation errors and sanitize responses
    if (error instanceof z.ZodError) {
      return NextResponse.json(formatValidationErrors(error), { status: 400 });
    }

    console.error('[API] Update job error:', error);

    return NextResponse.json(
      { error: sanitizeError(error) },
      { status: getErrorStatusCode(error) }
    );
  }
}

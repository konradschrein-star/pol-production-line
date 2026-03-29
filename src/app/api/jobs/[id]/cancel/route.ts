import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cancelJobQueues } from '@/lib/queue/cleanup';
import { jobIdParamsSchema, validateParams, formatValidationErrors } from '@/lib/validation/schemas';
import { z } from 'zod';

/**
 * POST /api/jobs/[id]/cancel
 * Cancel a job and clean up queue entries
 * PRODUCTION HARDENING (Bug #15 fix): Added UUID validation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // PRODUCTION HARDENING: Validate UUID parameter (Bug #15 fix)
    const { id } = validateParams(jobIdParamsSchema, params);
    const body = await request.json().catch(() => ({}));
    const reason = body.reason || 'Cancelled by user';

    console.log(`🚫 [API] Cancelling job ${id}...`);

    // Fetch current job status
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

    const currentStatus = jobResult.rows[0].status;

    // Cannot cancel completed jobs
    if (currentStatus === 'completed') {
      return NextResponse.json(
        { error: 'Cannot cancel completed job' },
        { status: 400 }
      );
    }

    // Already cancelled or failed
    if (currentStatus === 'cancelled' || currentStatus === 'failed') {
      console.log(`⚠️ [API] Job ${id} already in terminal state: ${currentStatus}`);
      return NextResponse.json(
        { message: 'Job already in terminal state', status: currentStatus },
        { status: 200 }
      );
    }

    // Cancel queue jobs (if applicable)
    if (currentStatus !== 'review_assets') {
      const cleanupResult = await cancelJobQueues(id, currentStatus);
      console.log(`🧹 [API] Queue cleanup result:`, cleanupResult);
    }

    // Update job status to cancelled
    await db.query(
      `UPDATE news_jobs
       SET status = 'cancelled',
           cancellation_reason = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [reason, id]
    );

    console.log(`✅ [API] Job ${id} cancelled successfully`);

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    // PRODUCTION HARDENING: Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(formatValidationErrors(error), { status: 400 });
    }

    console.error('❌ [API] Cancel job error:', error);

    return NextResponse.json(
      {
        error: 'Failed to cancel job',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

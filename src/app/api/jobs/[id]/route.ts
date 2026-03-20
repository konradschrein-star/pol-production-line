import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cancelJobQueues } from '@/lib/queue/cleanup';

/**
 * GET /api/jobs/[id]
 * Fetch job with all scenes
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

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
    console.error('❌ [API] Error fetching job:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch job',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/jobs/[id]
 * Hard delete job with queue cleanup
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

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
    console.error('❌ [API] Delete job error:', error);

    return NextResponse.json(
      {
        error: 'Failed to delete job',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/jobs/[id]
 * Edit job script (only allowed in pending or failed states)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { raw_script } = body;

    console.log(`✏️ [API] Editing job ${id}...`);

    // Validate script
    if (!raw_script || raw_script.length < 50 || raw_script.length > 10000) {
      return NextResponse.json(
        { error: 'Script must be between 50 and 10,000 characters' },
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

    // Update script and reset to pending if was failed
    await db.query(
      `UPDATE news_jobs
       SET raw_script = $1,
           status = 'pending',
           error_message = NULL,
           updated_at = NOW()
       WHERE id = $2`,
      [raw_script, id]
    );

    // Delete any existing analysis artifacts
    await db.query(
      `UPDATE news_jobs
       SET avatar_script = NULL,
           avatar_mp4_url = NULL
       WHERE id = $1`,
      [id]
    );

    await db.query(
      'DELETE FROM news_scenes WHERE job_id = $1',
      [id]
    );

    console.log(`✅ [API] Job ${id} script updated and reset to pending`);

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    console.error('❌ [API] Update job error:', error);

    return NextResponse.json(
      {
        error: 'Failed to update job',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

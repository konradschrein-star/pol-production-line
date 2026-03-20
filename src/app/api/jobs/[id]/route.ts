import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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

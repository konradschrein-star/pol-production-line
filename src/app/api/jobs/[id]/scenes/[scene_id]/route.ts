import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * PATCH /api/jobs/[id]/scenes/[scene_id]
 * Update scene ticker headline
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; scene_id: string } }
) {
  try {
    const { id, scene_id } = params;
    const body = await request.json();
    const { ticker_headline } = body;

    console.log(`✏️ [API] Updating scene ${scene_id} ticker headline...`);

    // Validate input
    if (!ticker_headline || typeof ticker_headline !== 'string') {
      return NextResponse.json(
        { error: 'ticker_headline is required and must be a string' },
        { status: 400 }
      );
    }

    if (ticker_headline.length > 200) {
      return NextResponse.json(
        { error: 'ticker_headline must not exceed 200 characters' },
        { status: 400 }
      );
    }

    // Check scene exists and belongs to job
    const checkResult = await db.query(
      'SELECT id FROM news_scenes WHERE id = $1 AND job_id = $2',
      [scene_id, id]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Scene not found or does not belong to this job' },
        { status: 404 }
      );
    }

    // Update ticker headline
    await db.query(
      'UPDATE news_scenes SET ticker_headline = $1 WHERE id = $2',
      [ticker_headline, scene_id]
    );

    console.log(`✅ [API] Scene ${scene_id} ticker headline updated`);

    return NextResponse.json({
      success: true,
      message: 'Ticker headline updated',
      scene_id,
      ticker_headline,
    });

  } catch (error) {
    console.error('❌ [API] Error updating scene:', error);

    return NextResponse.json(
      {
        error: 'Failed to update scene',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateThumbnailWithRetry } from '@/lib/integrations/thumbnail-api';

/**
 * POST /api/jobs/:id/thumbnail
 * Manually regenerate thumbnail for a completed job
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: jobId } = params;

    console.log(`\n🖼️ [Thumbnail API] Regenerating thumbnail for job ${jobId}`);

    // Parse request body (optional timestamp override)
    let timestamp = 5; // Default
    try {
      const body = await request.json();
      if (body.timestamp !== undefined) {
        timestamp = parseFloat(body.timestamp);
        if (isNaN(timestamp) || timestamp < 0) {
          return NextResponse.json(
            { error: 'Invalid timestamp. Must be a positive number.' },
            { status: 400 }
          );
        }
      }
    } catch {
      // No body or invalid JSON - use defaults
    }

    // 1. Fetch job
    const jobResult = await db.query(
      'SELECT id, status, final_video_url FROM news_jobs WHERE id = $1',
      [jobId]
    );

    if (jobResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    const job = jobResult.rows[0];

    // 2. Validate job status
    if (job.status !== 'completed') {
      return NextResponse.json(
        { error: `Cannot generate thumbnail for job in status: ${job.status}. Job must be completed.` },
        { status: 400 }
      );
    }

    // 3. Check if video file exists
    if (!job.final_video_url) {
      return NextResponse.json(
        { error: 'Job has no video file' },
        { status: 400 }
      );
    }

    // 4. Generate thumbnail
    console.log(`🎬 [Thumbnail API] Generating thumbnail from video: ${job.final_video_url}`);
    console.log(`   Timestamp: ${timestamp}s`);

    const result = await generateThumbnailWithRetry(
      job.final_video_url,
      jobId,
      {
        timestamp,
        width: 640,
        quality: 2,
      }
    );

    // 5. Update database
    await db.query(
      `UPDATE news_jobs
       SET thumbnail_url = $1, thumbnail_generated_at = NOW()
       WHERE id = $2`,
      [result.thumbnailPath, jobId]
    );

    console.log(`✅ [Thumbnail API] Thumbnail updated in database`);

    return NextResponse.json({
      success: true,
      thumbnailUrl: result.thumbnailPath,
      timestamp: result.timestamp,
      sizeInBytes: result.sizeInBytes,
      message: 'Thumbnail regenerated successfully',
    });

  } catch (error) {
    console.error('❌ [Thumbnail API] Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to generate thumbnail',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/jobs/:id/thumbnail
 * Delete thumbnail for a job
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: jobId } = params;

    console.log(`\n🗑️ [Thumbnail API] Deleting thumbnail for job ${jobId}`);

    // Update database (set to NULL)
    await db.query(
      `UPDATE news_jobs
       SET thumbnail_url = NULL, thumbnail_generated_at = NULL
       WHERE id = $1`,
      [jobId]
    );

    console.log(`✅ [Thumbnail API] Thumbnail removed from database`);

    return NextResponse.json({
      success: true,
      message: 'Thumbnail deleted successfully',
    });

  } catch (error) {
    console.error('❌ [Thumbnail API] Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to delete thumbnail',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

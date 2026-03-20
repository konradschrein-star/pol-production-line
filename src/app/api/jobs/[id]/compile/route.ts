import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { saveBuffer } from '@/lib/storage/local';
import { queueRender } from '@/lib/queue/queues';

/**
 * POST /api/jobs/[id]/compile
 * Upload HeyGen avatar MP4 and queue job for final rendering
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    console.log(`🎬 [API] Compiling job ${id}...`);

    // Fetch job
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

    const job = jobResult.rows[0];

    // Check job is in review_assets state
    if (job.status !== 'review_assets') {
      return NextResponse.json(
        {
          error: 'Job must be in review_assets state to compile',
          currentStatus: job.status,
        },
        { status: 400 }
      );
    }

    // Check all scenes have images
    const scenesResult = await db.query(
      `SELECT COUNT(*) as total,
              COUNT(CASE WHEN image_url IS NOT NULL THEN 1 END) as with_images
       FROM news_scenes
       WHERE job_id = $1`,
      [id]
    );

    const { total, with_images } = scenesResult.rows[0];

    if (parseInt(with_images) < parseInt(total)) {
      return NextResponse.json(
        {
          error: 'All scenes must have images before compiling',
          total: parseInt(total),
          with_images: parseInt(with_images),
          missing: parseInt(total) - parseInt(with_images),
        },
        { status: 400 }
      );
    }

    // Get form data
    const formData = await request.formData();
    const avatarFile = formData.get('avatar_mp4') as File;

    if (!avatarFile) {
      return NextResponse.json(
        { error: 'No avatar MP4 file provided. Use field name "avatar_mp4"' },
        { status: 400 }
      );
    }

    // Validate file type
    if (avatarFile.type !== 'video/mp4') {
      return NextResponse.json(
        {
          error: 'Invalid file type. Must be video/mp4',
          receivedType: avatarFile.type,
        },
        { status: 400 }
      );
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (avatarFile.size > maxSize) {
      return NextResponse.json(
        {
          error: 'File too large. Maximum size: 100MB',
          receivedSize: `${(avatarFile.size / 1024 / 1024).toFixed(2)}MB`,
        },
        { status: 400 }
      );
    }

    console.log(`📦 [API] Saving avatar: ${avatarFile.name} (${(avatarFile.size / 1024 / 1024).toFixed(2)} MB)`);

    // Convert File to Buffer
    const arrayBuffer = await avatarFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save avatar to local storage
    const filename = `${id}.mp4`;
    const localPath = await saveBuffer(buffer, 'avatars', filename);

    // Update job with avatar LOCAL PATH and set status to rendering
    await db.query(
      'UPDATE news_jobs SET avatar_mp4_url = $1, status = $2 WHERE id = $3',
      [localPath, 'rendering', id]
    );

    console.log(`💾 [API] Avatar saved: ${localPath}`);

    // Queue for rendering
    await queueRender.add('render-video', {
      jobId: id,
    });

    console.log(`✅ [API] Job ${id} queued for rendering`);

    return NextResponse.json({
      success: true,
      message: 'Avatar saved to local storage and job queued for rendering',
      job_id: id,
      avatar_url: localPath,
      status: 'rendering',
      file_name: avatarFile.name,
      file_size: avatarFile.size,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [API] Error compiling job:', error);

    return NextResponse.json(
      {
        error: 'Failed to compile job',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { saveBuffer } from '@/lib/storage/local';
import { queueRender } from '@/lib/queue/queues';
import { ErrorCode, createErrorResponse, logError } from '@/lib/errors/error-codes';
import { transcribeAudio } from '@/lib/audio/transcribe';
import { jobIdParamsSchema, validateParams, formatValidationErrors } from '@/lib/validation/schemas';
import { sanitizeError, getErrorStatusCode } from '@/lib/errors/safe-errors';
import { z } from 'zod';
import { makeRelativePath } from '@/lib/storage/path-resolver';

/**
 * POST /api/jobs/[id]/compile
 * Upload HeyGen avatar MP4 and queue job for final rendering
 * PRODUCTION HARDENING Phase 2: Added UUID validation and enhanced file validation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // PRODUCTION HARDENING: Validate UUID parameter
    const { id } = validateParams(jobIdParamsSchema, params);

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

    // Check job is in review_assets or failed state (allow retry)
    if (job.status !== 'review_assets' && job.status !== 'failed') {
      return NextResponse.json(
        {
          error: 'Job must be in review_assets or failed state to compile',
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

    // Check if avatar already exists in database
    const existingAvatarResult = await db.query(
      'SELECT avatar_mp4_url FROM news_jobs WHERE id = $1',
      [id]
    );
    const existingAvatarUrl = existingAvatarResult.rows[0]?.avatar_mp4_url;

    // Check content-type to determine if this is a file upload or manual approval
    const contentType = request.headers.get('content-type') || '';
    const isFormData = contentType.includes('multipart/form-data');

    // Get avatar file from form data (only if multipart)
    let avatarFile: File | null = null;
    if (isFormData) {
      const formData = await request.formData();
      avatarFile = formData.get('avatar_mp4') as File | null;
    }

    if (!avatarFile && !existingAvatarUrl) {
      logError('API/Compile', ErrorCode.AVATAR_UPLOAD_FAILED, 'No file provided and no existing avatar');
      return NextResponse.json(
        createErrorResponse(
          ErrorCode.AVATAR_UPLOAD_FAILED,
          'No avatar MP4 file provided and no existing avatar found. Please upload an avatar first.'
        ),
        { status: 400 }
      );
    }

    // If no new file provided, use existing avatar (manual approval)
    if (!avatarFile && existingAvatarUrl) {
      console.log(`✅ [API] Using existing avatar at ${existingAvatarUrl}`);

      // Update status to rendering and queue
      await db.query(
        'UPDATE news_jobs SET status = $1 WHERE id = $2',
        ['rendering', id]
      );

      await queueRender.add('render-video', { jobId: id });

      console.log(`✅ [API] Job ${id} manually approved and queued for rendering`);

      return NextResponse.json({
        success: true,
        message: 'Job manually approved and queued for rendering',
        job_id: id,
        avatar_url: existingAvatarUrl,
        status: 'rendering',
      });
    }

    // Validate file type (MIME type check)
    if (avatarFile.type !== 'video/mp4') {
      logError('API/Compile', ErrorCode.AVATAR_UPLOAD_FAILED, `Invalid MIME type: ${avatarFile.type}`);
      return NextResponse.json(
        createErrorResponse(
          ErrorCode.AVATAR_UPLOAD_FAILED,
          `Invalid file type "${avatarFile.type}". Please upload an MP4 video file (H.264 codec, 48kHz audio).`
        ),
        { status: 400 }
      );
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB (reduced from 100MB for security)
    if (avatarFile.size > maxSize) {
      const sizeMB = (avatarFile.size / 1024 / 1024).toFixed(2);
      logError('API/Compile', ErrorCode.AVATAR_UPLOAD_FAILED, `File too large: ${sizeMB}MB`);
      return NextResponse.json(
        createErrorResponse(
          ErrorCode.AVATAR_UPLOAD_FAILED,
          `File too large (${sizeMB}MB). Maximum size is 50MB. Please use the optimize-avatar.sh script to compress the file.`
        ),
        { status: 400 }
      );
    }

    console.log(`📦 [API] Saving avatar: ${avatarFile.name} (${(avatarFile.size / 1024 / 1024).toFixed(2)} MB)`);

    // Convert File to Buffer
    const arrayBuffer = await avatarFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // SECURITY: Validate MP4 magic bytes (file signature)
    // MP4 files start with: 00 00 00 [14-20] 66 74 79 70 (ftyp box)
    // Valid ftyp sizes: 0x14 (20), 0x18 (24), 0x1C (28), 0x20 (32)
    if (buffer.length < 8) {
      logError('API/Compile', ErrorCode.AVATAR_UPLOAD_FAILED, 'File too small to be valid MP4');
      return NextResponse.json(
        createErrorResponse(
          ErrorCode.AVATAR_UPLOAD_FAILED,
          'File is too small to be a valid MP4 video. Please upload a valid avatar video.'
        ),
        { status: 400 }
      );
    }

    const magicBytes = buffer.slice(0, 8);
    const hasValidMagicBytes =
      magicBytes[0] === 0x00 &&
      magicBytes[1] === 0x00 &&
      magicBytes[2] === 0x00 &&
      (magicBytes[3] >= 0x14 && magicBytes[3] <= 0x20) && // ftyp box size (20-32 bytes)
      magicBytes[4] === 0x66 && // 'f'
      magicBytes[5] === 0x74 && // 't'
      magicBytes[6] === 0x79 && // 'y'
      magicBytes[7] === 0x70;   // 'p'

    if (!hasValidMagicBytes) {
      logError('API/Compile', ErrorCode.AVATAR_UPLOAD_FAILED, 'Invalid MP4 file signature');
      return NextResponse.json(
        createErrorResponse(
          ErrorCode.AVATAR_UPLOAD_FAILED,
          'File does not appear to be a valid MP4 video (invalid file signature). Please upload a genuine MP4 file.'
        ),
        { status: 400 }
      );
    }

    console.log(`✅ [API] File signature validated (MP4)`);

    // Save avatar to local storage
    const filename = `${id}.mp4`;
    const localPath = await saveBuffer(buffer, 'avatars', filename);

    console.log(`💾 [API] Avatar saved: ${localPath}`);

    // OPTIMIZATION DISABLED: OffthreadVideo uses FFmpeg frame extraction, no browser limitations
    // Now supports full-quality HeyGen avatars of any size (even 40+ minute videos)
    // No compression needed - maintains original quality for professional output
    let finalAvatarPath = localPath;
    console.log(`✅ [API] Using original avatar (no compression): ${(buffer.length / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   OffthreadVideo handles large files via FFmpeg frame extraction`);

    // NEW: Transcribe audio for word-level timestamps
    console.log(`🎙️  [API] Transcribing audio...`);

    // Store relative path for database (portable across machines)
    const relativePath = makeRelativePath(finalAvatarPath);

    try {
      const transcription = await transcribeAudio(finalAvatarPath);

      console.log(`✅ [API] Transcription complete: ${transcription.words.length} words`);
      console.log(`   Text preview: ${transcription.text.substring(0, 100)}...`);

      // Update job with avatar path and set status to rendering
      await db.query(
        'UPDATE news_jobs SET avatar_mp4_url = $1, status = $2 WHERE id = $3',
        [relativePath, 'rendering', id]
      );

    } catch (transcribeError) {
      // Transcription failed - fall back to time-based pacing
      console.error(`⚠️  [API] Transcription failed, using time-based pacing:`, transcribeError);

      await db.query(
        'UPDATE news_jobs SET avatar_mp4_url = $1, status = $2, error_message = $3 WHERE id = $4',
        [
          relativePath,
          'rendering',
          `Transcription failed (falling back to time-based): ${transcribeError instanceof Error ? transcribeError.message : String(transcribeError)}`,
          id
        ]
      );
    }

    // Queue for rendering (transcription done synchronously before this)
    await queueRender.add('render-video', {
      jobId: id,
    });

    console.log(`✅ [API] Job ${id} queued for rendering`);

    return NextResponse.json({
      success: true,
      message: 'Avatar saved to local storage and job queued for rendering',
      job_id: id,
      avatar_url: relativePath,
      status: 'rendering',
      file_name: avatarFile.name,
      file_size: avatarFile.size,
      optimized: finalAvatarPath !== localPath,
    });

  } catch (error: unknown) {
    // PRODUCTION HARDENING: Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(formatValidationErrors(error), { status: 400 });
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Determine error code based on error type
    let errorCode = ErrorCode.UNKNOWN_ERROR;
    if (errorMessage.includes('database') || errorMessage.includes('postgres')) {
      errorCode = ErrorCode.DATABASE_ERROR;
    } else if (errorMessage.includes('redis') || errorMessage.includes('queue')) {
      errorCode = ErrorCode.QUEUE_FAILED;
    } else if (errorMessage.includes('disk') || errorMessage.includes('ENOSPC')) {
      errorCode = ErrorCode.DISK_SPACE_LOW;
    }

    logError('API/Compile', errorCode, error);

    // PRODUCTION HARDENING: Sanitize error message for client
    return NextResponse.json(
      {
        ...createErrorResponse(errorCode),
        error: sanitizeError(error),
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: getErrorStatusCode(error) }
    );
  }
}

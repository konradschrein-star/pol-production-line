import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { db } from '@/lib/db';
import { queueAnalyze } from '@/lib/queue/queues';
import { ErrorCode, createErrorResponse, logError } from '@/lib/errors/error-codes';

const STORAGE_PATH = process.env.STORAGE_PATH || 'C:\\Users\\konra\\ObsidianNewsDesk';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const raw_script = formData.get('raw_script') as string;
    const provider = formData.get('provider') as string || 'openai';
    const style_preset_id = formData.get('style_preset_id') as string | null;
    const skip_review = formData.get('skip_review') === 'true';
    const avatarFile = formData.get('avatar') as File | null;

    console.log(`🤖 [API] Selected AI provider: ${provider}`);
    if (style_preset_id) {
      console.log(`📐 [API] Using style preset: ${style_preset_id}`);
    }
    if (skip_review) {
      console.log(`⏭️  [API] Skip human review enabled - will auto-approve when images complete`);
    }

    // Validate input
    if (!raw_script || typeof raw_script !== 'string') {
      return NextResponse.json(
        { error: 'raw_script is required and must be a string' },
        { status: 400 }
      );
    }

    if (raw_script.length < 50) {
      logError('API/Analyze', ErrorCode.SCRIPT_TOO_SHORT, `Length: ${raw_script.length}`);
      return NextResponse.json(
        createErrorResponse(ErrorCode.SCRIPT_TOO_SHORT, `Your script has ${raw_script.length} characters. Need at least 100.`),
        { status: 400 }
      );
    }

    if (raw_script.length > 10000) {
      return NextResponse.json(
        { error: 'raw_script must not exceed 10,000 characters' },
        { status: 400 }
      );
    }

    console.log(`\n📝 [API] Creating new job for script (${raw_script.length} chars)`);

    // Save avatar file if provided
    let avatarPath: string | null = null;
    if (avatarFile) {
      console.log(`🎥 [API] Avatar file provided: ${avatarFile.name} (${(avatarFile.size / 1024 / 1024).toFixed(2)} MB)`);

      // Ensure avatars directory exists
      const avatarsDir = join(STORAGE_PATH, 'avatars');
      if (!existsSync(avatarsDir)) {
        await mkdir(avatarsDir, { recursive: true });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `avatar_${timestamp}.mp4`;
      avatarPath = join(avatarsDir, filename);

      // Save file to disk
      const bytes = await avatarFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(avatarPath, buffer);

      console.log(`✅ [API] Avatar saved to: ${avatarPath}`);
    }

    // Create job in database with avatar path and style preset
    const result = await db.query(
      `INSERT INTO news_jobs (raw_script, avatar_script, avatar_mp4_url, status, style_preset_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, status, created_at`,
      [raw_script, raw_script, avatarPath, 'pending', style_preset_id || null]
    );

    const job = result.rows[0];

    console.log(`✅ [API] Job created: ${job.id}`);

    // Queue analysis job with provider selection
    await queueAnalyze.add('analyze-script', {
      jobId: job.id,
      rawScript: raw_script,
      provider: provider as 'openai' | 'claude' | 'google' | 'groq',
    });

    console.log(`📨 [API] Job ${job.id} queued for analysis\n`);

    return NextResponse.json(
      {
        success: true,
        job: {
          id: job.id,
          status: job.status,
          created_at: job.created_at,
        },
        message: 'Job created and queued for analysis',
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Determine error code based on error type
    let errorCode = ErrorCode.UNKNOWN_ERROR;
    if (errorMessage.includes('database') || errorMessage.includes('postgres')) {
      errorCode = ErrorCode.DATABASE_ERROR;
    } else if (errorMessage.includes('redis') || errorMessage.includes('queue')) {
      errorCode = ErrorCode.QUEUE_FAILED;
    }

    logError('API/Analyze', errorCode, error);

    return NextResponse.json(
      {
        ...createErrorResponse(errorCode),
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

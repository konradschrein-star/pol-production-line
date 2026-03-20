import { NextResponse } from 'next/server';
import { queueImages } from '@/lib/queue/queues';
import { ErrorCode, createErrorResponse, logError } from '@/lib/errors/error-codes';

/**
 * POST /api/queue/resume
 * Resumes a paused image generation queue
 */
export async function POST() {
  try {
    console.log('🔄 [API] Resuming image queue...');

    // Check if queue is paused
    const isPaused = await queueImages.isPaused();

    if (!isPaused) {
      console.log('⚠️  [API] Queue is not paused, nothing to resume');
      return NextResponse.json(
        {
          success: true,
          message: 'Queue is already running',
          wasPaused: false,
        },
        { status: 200 }
      );
    }

    // Resume the queue
    await queueImages.resume();

    console.log('✅ [API] Image queue resumed successfully');

    return NextResponse.json(
      {
        success: true,
        message: 'Queue resumed successfully',
        wasPaused: true,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('API/QueueResume', ErrorCode.QUEUE_FAILED, error);

    return NextResponse.json(
      {
        ...createErrorResponse(ErrorCode.QUEUE_FAILED),
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/queue/resume
 * Check queue status (paused or running)
 */
export async function GET() {
  try {
    const isPaused = await queueImages.isPaused();
    const jobCounts = await queueImages.getJobCounts();

    return NextResponse.json(
      {
        isPaused,
        waiting: jobCounts.waiting,
        active: jobCounts.active,
        completed: jobCounts.completed,
        failed: jobCounts.failed,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('API/QueueStatus', ErrorCode.QUEUE_FAILED, error);

    return NextResponse.json(
      {
        ...createErrorResponse(ErrorCode.QUEUE_FAILED),
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

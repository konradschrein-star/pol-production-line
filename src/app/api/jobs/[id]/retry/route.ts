/**
 * Job Retry API Endpoint
 *
 * POST /api/jobs/:id/retry - Retry a failed job
 */

import { NextRequest, NextResponse } from 'next/server';
import { retryManager } from '@/lib/queue/retry-manager';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: jobId } = params;

    const success = await retryManager.retryJob(jobId);

    if (!success) {
      return NextResponse.json(
        {
          error: 'Job cannot be retried',
          details: 'Job may not be failed, not retryable, or exceeded max retries',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Job queued for retry',
      jobId,
    });
  } catch (error) {
    console.error('❌ [Retry API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to retry job',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

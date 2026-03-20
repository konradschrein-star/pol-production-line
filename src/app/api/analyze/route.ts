import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { queueAnalyze } from '@/lib/queue/queues';
import { ErrorCode, createErrorResponse, logError } from '@/lib/errors/error-codes';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { raw_script } = body;

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

    // Create job in database
    const result = await db.query(
      `INSERT INTO news_jobs (raw_script, status)
       VALUES ($1, $2)
       RETURNING id, status, created_at`,
      [raw_script, 'pending']
    );

    const job = result.rows[0];

    console.log(`✅ [API] Job created: ${job.id}`);

    // Queue analysis job
    await queueAnalyze.add('analyze-script', {
      jobId: job.id,
      rawScript: raw_script,
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

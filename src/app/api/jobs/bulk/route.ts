import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withTransaction } from '@/lib/db/transactions';
import { cancelJobQueues } from '@/lib/queue/cleanup';

/**
 * POST /api/jobs/bulk
 * Bulk operations on jobs (delete, cancel)
 */
export async function POST(request: NextRequest) {
  try {
    const { action, jobIds } = await request.json();

    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      return NextResponse.json(
        { error: 'jobIds must be a non-empty array' },
        { status: 400 }
      );
    }

    console.log(`📦 [API] Bulk ${action} operation on ${jobIds.length} jobs`);

    const results = {
      succeeded: [] as string[],
      failed: [] as Array<{ jobId: string; error: string }>,
    };

    switch (action) {
      case 'delete':
        // Delete each job individually with proper locking to prevent race conditions
        for (const jobId of jobIds) {
          try {
            await withTransaction(async (client) => {
              // Lock the row with FOR UPDATE to prevent concurrent modifications
              const jobResult = await client.query(
                'SELECT status FROM news_jobs WHERE id = $1 FOR UPDATE',
                [jobId]
              );

              if (jobResult.rows.length > 0) {
                const status = jobResult.rows[0].status;

                // Cancel queue entries outside transaction (queue operations don't need locks)
                // This is safe because we have the row lock
                await cancelJobQueues(jobId, status);

                // Delete the job (still holding the lock)
                await client.query('DELETE FROM news_jobs WHERE id = $1', [jobId]);

                results.succeeded.push(jobId);
              } else {
                // Job doesn't exist - consider it a success (idempotent delete)
                results.succeeded.push(jobId);
              }
            });
          } catch (error) {
            results.failed.push({
              jobId,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
        break;

      case 'cancel':
        // Cancel each job with proper locking to prevent race conditions
        for (const jobId of jobIds) {
          try {
            await withTransaction(async (client) => {
              // Lock the row with FOR UPDATE to prevent concurrent modifications
              const jobResult = await client.query(
                'SELECT status FROM news_jobs WHERE id = $1 FOR UPDATE',
                [jobId]
              );

              if (jobResult.rows.length > 0) {
                const status = jobResult.rows[0].status;

                // Only cancel if job is not already in a terminal state
                if (status !== 'completed' && status !== 'cancelled' && status !== 'failed') {
                  // Cancel queue entries (safe because we hold the row lock)
                  if (status !== 'review_assets') {
                    await cancelJobQueues(jobId, status);
                  }

                  // Update job status to cancelled (still holding the lock)
                  await client.query(
                    `UPDATE news_jobs
                     SET status = 'cancelled',
                         cancellation_reason = 'Bulk cancelled by user',
                         updated_at = NOW()
                     WHERE id = $1`,
                    [jobId]
                  );
                }

                results.succeeded.push(jobId);
              } else {
                // Job doesn't exist - log but don't fail
                console.warn(`[BULK] Job ${jobId} not found during cancel operation`);
                results.failed.push({
                  jobId,
                  error: 'Job not found',
                });
              }
            });
          } catch (error) {
            results.failed.push({
              jobId,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be "delete" or "cancel"' },
          { status: 400 }
        );
    }

    console.log(`✅ [API] Bulk operation complete: ${results.succeeded.length} succeeded, ${results.failed.length} failed`);

    return NextResponse.json({
      success: results.failed.length === 0,
      results,
    });
  } catch (error) {
    console.error('❌ [API] Bulk operation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to perform bulk operation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

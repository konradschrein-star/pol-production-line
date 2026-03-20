import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
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
        // Delete each job individually to handle queue cleanup
        for (const jobId of jobIds) {
          try {
            const jobResult = await db.query(
              'SELECT status FROM news_jobs WHERE id = $1',
              [jobId]
            );

            if (jobResult.rows.length > 0) {
              await cancelJobQueues(jobId, jobResult.rows[0].status);
              await db.query('DELETE FROM news_jobs WHERE id = $1', [jobId]);
              results.succeeded.push(jobId);
            }
          } catch (error) {
            results.failed.push({
              jobId,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
        break;

      case 'cancel':
        // Cancel each job
        for (const jobId of jobIds) {
          try {
            const jobResult = await db.query(
              'SELECT status FROM news_jobs WHERE id = $1',
              [jobId]
            );

            if (jobResult.rows.length > 0) {
              const status = jobResult.rows[0].status;

              if (status !== 'completed' && status !== 'cancelled' && status !== 'failed') {
                if (status !== 'review_assets') {
                  await cancelJobQueues(jobId, status);
                }

                await db.query(
                  `UPDATE news_jobs
                   SET status = 'cancelled',
                       cancellation_reason = 'Bulk cancelled by user',
                       updated_at = NOW()
                   WHERE id = $1`,
                  [jobId]
                );
              }

              results.succeeded.push(jobId);
            }
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

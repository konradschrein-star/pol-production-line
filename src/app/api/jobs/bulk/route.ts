import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withTransaction } from '@/lib/db/transactions';
import { cancelJobQueues } from '@/lib/queue/cleanup';
import { BulkOperationSchema } from '@/lib/validation/bulk-schemas';
import { logBulkOperation } from '@/lib/security/audit-logger';

/**
 * POST /api/jobs/bulk
 * Bulk operations on jobs (delete, cancel, retry)
 *
 * Phase 8 Security Enhancements:
 * - Zod schema validation
 * - Audit logging for all operations
 * - Max 50 jobs per operation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body with Zod
    const validation = BulkOperationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          message: 'Invalid request body',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { action, jobIds, reason } = validation.data;

    // Get IP address for audit logging
    const ip =
      request.ip ||
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown';

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

      case 'retry':
        // Retry failed jobs by resetting status to 'pending'
        for (const jobId of jobIds) {
          try {
            await withTransaction(async (client) => {
              // Lock the row with FOR UPDATE to prevent concurrent modifications
              const jobResult = await client.query(
                'SELECT status, retry_count, max_retries FROM news_jobs WHERE id = $1 FOR UPDATE',
                [jobId]
              );

              if (jobResult.rows.length > 0) {
                const { status, retry_count, max_retries } = jobResult.rows[0];

                // Only retry failed jobs
                if (status === 'failed') {
                  // Check if max retries exceeded
                  if (retry_count >= max_retries) {
                    console.warn(`[BULK] Job ${jobId} has exceeded max retries (${retry_count}/${max_retries})`);
                    results.failed.push({
                      jobId,
                      error: `Max retries (${max_retries}) exceeded`,
                    });
                    return;
                  }

                  // Reset status to pending for retry
                  await client.query(
                    `UPDATE news_jobs
                     SET status = 'pending',
                         error_message = NULL,
                         retry_count = retry_count + 1,
                         last_retry_at = NOW(),
                         updated_at = NOW()
                     WHERE id = $1`,
                    [jobId]
                  );

                  console.log(`[BULK] Job ${jobId} reset to pending for retry (attempt ${retry_count + 1}/${max_retries})`);
                  results.succeeded.push(jobId);
                } else {
                  // Not a failed job - skip but don't fail
                  console.log(`[BULK] Job ${jobId} status is ${status}, skipping retry`);
                  results.succeeded.push(jobId);
                }
              } else {
                // Job doesn't exist
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
          { error: 'Invalid action. Must be "delete", "cancel", or "retry"' },
          { status: 400 }
        );
    }

    console.log(`✅ [API] Bulk operation complete: ${results.succeeded.length} succeeded, ${results.failed.length} failed`);

    // Log bulk operation to audit log
    await logBulkOperation(action, jobIds.length, ip, {
      succeeded: results.succeeded.length,
      failed: results.failed.length,
      reason,
    });

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

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { queueImages } from '@/lib/queue/queues';

/**
 * POST /api/jobs/:id/scenes/bulk-retry
 *
 * Retries multiple failed scenes at once
 * Optionally resets prompts to original (undoing sanitization)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: jobId } = params;
    const body = await request.json();
    const { scene_ids, reset_prompts = false } = body;

    // Validate scene_ids (optional - if not provided, retry all failed scenes)
    let sceneIdsToRetry: string[] = scene_ids || [];

    if (!scene_ids) {
      // Get all failed scenes for this job
      const result = await db.query(
        `SELECT id FROM news_scenes
         WHERE job_id = $1 AND generation_status = 'failed'`,
        [jobId]
      );

      sceneIdsToRetry = result.rows.map((row: any) => row.id);
    }

    if (sceneIdsToRetry.length === 0) {
      return NextResponse.json(
        { error: 'No failed scenes found to retry' },
        { status: 400 }
      );
    }

    // If reset_prompts is true, we need to get original prompts from generation_history
    // For now, we'll just reset error state and re-queue with current prompts
    // TODO: Implement prompt history retrieval if needed

    // Update all scenes to pending and clear error state
    const updateQuery = `
      UPDATE news_scenes
      SET
        generation_status = 'pending',
        error_message = NULL,
        error_category = NULL,
        last_error_code = NULL,
        ${reset_prompts ? 'sanitization_attempts = 0,' : ''}
        failed_permanently = false,
        retry_count = 0,
        updated_at = NOW()
      WHERE id = ANY($1::uuid[]) AND job_id = $2
      RETURNING id, image_prompt
    `;

    const result = await db.query(updateQuery, [sceneIdsToRetry, jobId]);
    const updatedScenes = result.rows;

    // Re-queue all scenes for image generation
    const queuePromises = updatedScenes.map((scene: any) =>
      queueImages.add('generate-image', {
        sceneId: scene.id,
        imagePrompt: scene.image_prompt,
        jobId,
      })
    );

    await Promise.all(queuePromises);

    console.log(
      `🔄 [BULK-RETRY] Re-queued ${updatedScenes.length} scenes for job ${jobId}`
    );

    // Update job status back to generating_images if needed
    const jobResult = await db.query(
      'SELECT status FROM news_jobs WHERE id = $1',
      [jobId]
    );

    const currentStatus = jobResult.rows[0]?.status;

    if (currentStatus === 'review_assets' || currentStatus === 'failed') {
      await db.query(
        `UPDATE news_jobs
         SET status = 'generating_images', updated_at = NOW()
         WHERE id = $1`,
        [jobId]
      );

      console.log(`📊 [BULK-RETRY] Job ${jobId} status updated to generating_images`);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully re-queued ${updatedScenes.length} scenes`,
      retried_count: updatedScenes.length,
      scene_ids: updatedScenes.map((s: any) => s.id),
    });
  } catch (error) {
    console.error('[API] Error in bulk retry:', error);
    return NextResponse.json(
      {
        error: 'Failed to retry scenes',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

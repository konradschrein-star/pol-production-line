import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { queueImages } from '@/lib/queue/queues';

/**
 * POST /api/jobs/:id/scenes/:scene_id/edit-and-retry
 *
 * Allows manual editing of a failed scene prompt and resets error state
 * Used when automated sanitization fails after max attempts
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; scene_id: string } }
) {
  try {
    const { id: jobId, scene_id: sceneId } = params;
    const body = await request.json();
    const { new_prompt, reset_attempts = true } = body;

    if (!new_prompt || typeof new_prompt !== 'string') {
      return NextResponse.json(
        { error: 'new_prompt is required and must be a string' },
        { status: 400 }
      );
    }

    // Verify scene exists and belongs to this job
    const sceneCheck = await db.query(
      'SELECT id, job_id, generation_status FROM news_scenes WHERE id = $1 AND job_id = $2',
      [sceneId, jobId]
    );

    if (sceneCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Scene not found or does not belong to this job' },
        { status: 404 }
      );
    }

    // Update scene with new prompt and reset error state
    const updateQuery = `
      UPDATE news_scenes
      SET
        image_prompt = $1,
        generation_status = $2,
        error_message = NULL,
        error_category = NULL,
        last_error_code = NULL,
        sanitization_attempts = $3,
        failed_permanently = false,
        retry_count = 0,
        updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `;

    const result = await db.query(updateQuery, [
      new_prompt,
      'pending',
      reset_attempts ? 0 : null, // Reset to 0 if requested, otherwise keep current
      sceneId,
    ]);

    const updatedScene = result.rows[0];

    // Re-queue the scene for image generation
    await queueImages.add('generate-image', {
      sceneId: updatedScene.id,
      imagePrompt: new_prompt,
      jobId,
    });

    console.log(`✏️ [EDIT-AND-RETRY] Scene ${sceneId} prompt updated and re-queued`);
    console.log(`   New prompt: ${new_prompt.substring(0, 100)}...`);

    return NextResponse.json({
      success: true,
      message: 'Scene prompt updated and re-queued for generation',
      scene: {
        id: updatedScene.id,
        image_prompt: updatedScene.image_prompt,
        generation_status: updatedScene.generation_status,
        sanitization_attempts: updatedScene.sanitization_attempts,
      },
    });
  } catch (error) {
    console.error('[API] Error in edit-and-retry:', error);
    return NextResponse.json(
      {
        error: 'Failed to update scene and retry',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { queueImages } from '@/lib/queue/queues';
import { sceneIdParamsSchema, validateParams, formatValidationErrors } from '@/lib/validation/schemas';
import { z } from 'zod';

/**
 * POST /api/jobs/[id]/scenes/[scene_id]/regenerate
 * Re-queue a scene for image generation
 * PRODUCTION HARDENING (Bug #15 fix): Added UUID validation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; scene_id: string } }
) {
  try {
    // PRODUCTION HARDENING: Validate UUID parameters (Bug #15 fix)
    const { id, scene_id } = validateParams(sceneIdParamsSchema, params);

    console.log(`🔄 [API] Regenerating image for scene ${scene_id}...`);

    // Fetch scene
    const sceneResult = await db.query(
      'SELECT * FROM news_scenes WHERE id = $1 AND job_id = $2',
      [scene_id, id]
    );

    if (sceneResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Scene not found or does not belong to this job' },
        { status: 404 }
      );
    }

    const scene = sceneResult.rows[0];

    // Check job status
    const jobResult = await db.query(
      'SELECT status FROM news_jobs WHERE id = $1',
      [id]
    );

    const jobStatus = jobResult.rows[0]?.status;

    if (!['generating_images', 'review_assets'].includes(jobStatus)) {
      return NextResponse.json(
        {
          error: 'Can only regenerate scenes when job is in generating_images or review_assets state',
          currentStatus: jobStatus,
        },
        { status: 400 }
      );
    }

    // Reset scene status
    await db.query(
      'UPDATE news_scenes SET generation_status = $1, image_url = NULL, error_message = NULL WHERE id = $2',
      ['pending', scene_id]
    );

    // Re-queue to images queue
    await queueImages.add('generate-image', {
      sceneId: scene_id,
      imagePrompt: scene.image_prompt,
      jobId: id,
    });

    console.log(`✅ [API] Scene ${scene_id} re-queued for generation`);

    return NextResponse.json({
      success: true,
      message: 'Scene re-queued for generation',
      scene_id,
      status: 'pending',
    });

  } catch (error: unknown) {
    // PRODUCTION HARDENING: Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(formatValidationErrors(error), { status: 400 });
    }

    console.error('❌ [API] Error regenerating scene:', error);

    return NextResponse.json(
      {
        error: 'Failed to regenerate scene',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

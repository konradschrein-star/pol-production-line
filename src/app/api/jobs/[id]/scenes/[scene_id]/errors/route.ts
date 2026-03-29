import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getErrorDetails } from '@/lib/errors/categorization';

/**
 * GET /api/jobs/:id/scenes/:scene_id/errors
 *
 * Retrieves detailed error information for a failed scene
 * Includes current error details, generation history, and retry status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; scene_id: string } }
) {
  try {
    const { id: jobId, scene_id: sceneId } = params;

    // Fetch scene error details
    const sceneResult = await db.query(
      `SELECT
        id,
        job_id,
        scene_order,
        image_prompt,
        generation_status,
        error_message,
        error_category,
        last_error_code,
        sanitization_attempts,
        retry_count,
        failed_permanently
      FROM news_scenes
      WHERE id = $1 AND job_id = $2`,
      [sceneId, jobId]
    );

    if (sceneResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Scene not found' },
        { status: 404 }
      );
    }

    const scene = sceneResult.rows[0];

    // Fetch generation history for this scene
    const historyResult = await db.query(
      `SELECT
        attempt_number,
        generation_params,
        error_message,
        generation_time_ms,
        created_at
      FROM generation_history
      WHERE scene_id = $1
      ORDER BY attempt_number DESC`,
      [sceneId]
    );

    // Map generation history to user-friendly format
    const generationHistory = historyResult.rows.map((entry: any) => {
      const params = entry.generation_params || {};
      return {
        attempt: entry.attempt_number,
        timestamp: entry.created_at,
        prompt_used: params.prompt || scene.image_prompt,
        error: entry.error_message || 'Unknown error',
        generation_time_ms: entry.generation_time_ms,
      };
    });

    // Get error details based on category
    const errorCategory = scene.error_category || 'unknown';
    const sanitizationAttempts = scene.sanitization_attempts || 0;
    const errorInfo = getErrorDetails(errorCategory, sanitizationAttempts);

    // Determine if scene can be retried
    const canRetry =
      scene.generation_status !== 'completed' &&
      !scene.failed_permanently &&
      sanitizationAttempts < 3;

    return NextResponse.json({
      current_error: {
        message: errorInfo.userMessage,
        code: scene.last_error_code || 'UNKNOWN_ERROR',
        category: errorCategory,
        solution: errorInfo.solution,
      },
      sanitization_attempts: sanitizationAttempts,
      generation_history: generationHistory,
      can_retry: canRetry,
      scene_details: {
        scene_order: scene.scene_order,
        current_prompt: scene.image_prompt,
        status: scene.generation_status,
        retry_count: scene.retry_count || 0,
      },
    });
  } catch (error) {
    console.error('[API] Error fetching scene error details:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch scene error details',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

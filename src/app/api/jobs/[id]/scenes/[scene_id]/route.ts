import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sceneIdParamsSchema, sceneUpdateSchema, validateParams, validateBody, formatValidationErrors } from '@/lib/validation/schemas';
import { sanitizeError, getErrorStatusCode } from '@/lib/errors/safe-errors';
import { z } from 'zod';

/**
 * PATCH /api/jobs/[id]/scenes/[scene_id]
 * Update scene ticker headline and/or image prompt
 * PRODUCTION HARDENING Phase 2: Added Zod validation
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; scene_id: string } }
) {
  try {
    // PRODUCTION HARDENING: Validate UUID parameters
    const { id, scene_id } = validateParams(sceneIdParamsSchema, params);

    // PRODUCTION HARDENING: Validate request body
    const body = await request.json();
    const { ticker_headline, image_prompt } = await validateBody(sceneUpdateSchema, body);

    console.log(`✏️ [API] Updating scene ${scene_id}...`);

    // Validate input - at least one field must be provided
    if (!ticker_headline && !image_prompt) {
      return NextResponse.json(
        { error: 'At least one of ticker_headline or image_prompt is required' },
        { status: 400 }
      );
    }

    // Check scene exists and belongs to job
    const checkResult = await db.query(
      'SELECT id FROM news_scenes WHERE id = $1 AND job_id = $2',
      [scene_id, id]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Scene not found or does not belong to this job' },
        { status: 404 }
      );
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (ticker_headline) {
      updates.push(`ticker_headline = $${paramIndex++}`);
      values.push(ticker_headline);
    }

    if (image_prompt) {
      updates.push(`image_prompt = $${paramIndex++}`);
      values.push(image_prompt);
    }

    values.push(scene_id);

    await db.query(
      `UPDATE news_scenes SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    );

    console.log(`✅ [API] Scene ${scene_id} updated`);

    return NextResponse.json({
      success: true,
      message: 'Scene updated',
      scene_id,
      ticker_headline: ticker_headline || undefined,
      image_prompt: image_prompt || undefined,
    });

  } catch (error: unknown) {
    // PRODUCTION HARDENING: Handle validation errors and sanitize responses
    if (error instanceof z.ZodError) {
      return NextResponse.json(formatValidationErrors(error), { status: 400 });
    }

    console.error('[API] Error updating scene:', error);

    return NextResponse.json(
      { error: sanitizeError(error) },
      { status: getErrorStatusCode(error) }
    );
  }
}

/**
 * GET /api/style-presets - Fetch all style presets
 * POST /api/style-presets - Create new custom preset
 */

import { NextRequest, NextResponse } from 'next/server';
import { stylePresetManager } from '@/lib/style-presets/manager';

/**
 * GET - Fetch all style presets
 */
export async function GET() {
  try {
    const presets = await stylePresetManager.getAll();

    return NextResponse.json({
      success: true,
      presets,
    });
  } catch (error) {
    console.error('Failed to fetch style presets:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch style presets',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Create new custom style preset
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      name,
      description,
      reference_image_urls,
      prompt_prefix,
      prompt_suffix,
      visual_guidelines,
      color_palette,
      composition_rules,
      example_prompts,
      reference_strategy,
    } = body;

    // Validation
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    if (name.length < 3 || name.length > 100) {
      return NextResponse.json(
        { error: 'Name must be between 3 and 100 characters' },
        { status: 400 }
      );
    }

    // Create preset with enhanced fields
    const preset = await stylePresetManager.create({
      name,
      description,
      reference_image_urls,
      prompt_prefix,
      prompt_suffix,
      visual_guidelines,
      color_palette,
      composition_rules,
      example_prompts,
      reference_strategy: reference_strategy || 'none',
    });

    return NextResponse.json({
      success: true,
      preset,
    });
  } catch (error) {
    console.error('Failed to create style preset:', error);
    return NextResponse.json(
      {
        error: 'Failed to create style preset',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update existing style preset
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Preset ID is required' },
        { status: 400 }
      );
    }

    const preset = await stylePresetManager.update(id, updates);

    if (!preset) {
      return NextResponse.json(
        { error: 'Style preset not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      preset,
    });
  } catch (error) {
    console.error('Failed to update style preset:', error);
    return NextResponse.json(
      {
        error: 'Failed to update style preset',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete custom style preset
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Preset ID is required' },
        { status: 400 }
      );
    }

    const deleted = await stylePresetManager.delete(id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Style preset not found or is a default preset' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Style preset deleted',
    });
  } catch (error) {
    console.error('Failed to delete style preset:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete style preset',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Personas API Endpoints
 *
 * GET    /api/personas       - List all personas (with filters)
 * POST   /api/personas       - Create new persona
 * PATCH  /api/personas       - Update existing persona
 * DELETE /api/personas?id=X  - Delete persona (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { personaManager } from '@/lib/personas/manager';

/**
 * GET - Fetch all personas
 *
 * Query params:
 * - activeOnly: boolean
 * - category: string
 * - systemPresetsOnly: boolean
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const filters = {
      activeOnly: searchParams.get('activeOnly') === 'true',
      category: searchParams.get('category') || undefined,
      systemPresetsOnly: searchParams.get('systemPresetsOnly') === 'true'
        ? true
        : searchParams.get('systemPresetsOnly') === 'false'
        ? false
        : undefined,
    };

    const personas = await personaManager.getAll(filters);

    return NextResponse.json({
      success: true,
      personas,
      count: personas.length,
    });
  } catch (error) {
    console.error('❌ [Personas API] GET error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch personas',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Create new persona
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      name,
      description,
      category,
      stylePresetId,
      colorScheme,
      aiProvider,
      toneGuidelines,
      scriptTemplate,
      targetAudience,
      defaultVideoLengthSeconds,
      scenesPerVideo,
      pacingStyle,
      musicGenre,
      voiceStyle,
      isActive,
      createdBy,
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

    // Check for duplicate name
    const existing = await personaManager.getByName(name);
    if (existing) {
      return NextResponse.json(
        { error: `Persona with name "${name}" already exists` },
        { status: 409 }
      );
    }

    // Create persona
    const persona = await personaManager.create({
      name,
      description,
      category,
      stylePresetId,
      colorScheme,
      aiProvider,
      toneGuidelines,
      scriptTemplate,
      targetAudience,
      defaultVideoLengthSeconds,
      scenesPerVideo,
      pacingStyle,
      musicGenre,
      voiceStyle,
      isActive,
      createdBy,
    });

    return NextResponse.json({
      success: true,
      persona,
    });
  } catch (error) {
    console.error('❌ [Personas API] POST error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create persona',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update existing persona
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Persona ID is required' },
        { status: 400 }
      );
    }

    const persona = await personaManager.update(id, updates);

    if (!persona) {
      return NextResponse.json(
        { error: 'Persona not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      persona,
    });
  } catch (error) {
    console.error('❌ [Personas API] PATCH error:', error);

    // Check for specific error messages
    if (error instanceof Error && error.message === 'Cannot modify system presets') {
      return NextResponse.json(
        { error: 'System presets cannot be modified' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to update persona',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete persona (soft delete)
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Persona ID is required' },
        { status: 400 }
      );
    }

    const deleted = await personaManager.delete(id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Persona not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Persona deleted',
    });
  } catch (error) {
    console.error('❌ [Personas API] DELETE error:', error);

    // Check for specific error messages
    if (error instanceof Error && error.message === 'Cannot delete system presets') {
      return NextResponse.json(
        { error: 'System presets cannot be deleted' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to delete persona',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

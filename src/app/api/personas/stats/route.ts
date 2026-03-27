/**
 * Personas Usage Statistics API
 *
 * GET /api/personas/stats - Get usage analytics
 */

import { NextResponse } from 'next/server';
import { personaManager } from '@/lib/personas/manager';

export async function GET() {
  try {
    const stats = await personaManager.getUsageStats();

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('❌ [Personas Stats API] GET error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch persona statistics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

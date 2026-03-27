/**
 * Whisk Token Refresh API Route
 *
 * Endpoint: POST /api/whisk/refresh-token
 * Purpose: Manually trigger token refresh via browser automation
 *
 * Response:
 * - 200: { success: true, message, timestamp, tokenPreview }
 * - 500: { success: false, error: string }
 */

import { WhiskTokenRefresher } from '@/lib/whisk/token-refresh';
import { WhiskTokenStore } from '@/lib/whisk/token-store';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    console.log('🔄 [API] Manual token refresh requested');

    const refresher = new WhiskTokenRefresher();
    const { token, timestamp } = await refresher.refreshToken();

    await WhiskTokenStore.setToken(token);

    console.log('✅ [API] Manual token refresh successful');

    return NextResponse.json({
      success: true,
      message: 'Token refreshed successfully',
      timestamp,
      tokenPreview: token.substring(0, 20) + '...', // For debugging
      expiresAt: new Date(timestamp + 60 * 60 * 1000).toISOString(), // 60 minutes from now
    });

  } catch (error) {
    console.error('❌ [API] Manual token refresh failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

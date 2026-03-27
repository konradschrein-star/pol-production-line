/**
 * POST /api/whisk/token - Receive OAuth token from Chrome extension
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { WhiskTokenStore } from '@/lib/whisk/token-store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, timestamp } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    console.log('🔑 [Whisk Token] Received new token from extension');
    console.log(`   Token: ${token.substring(0, 20)}...`);
    console.log(`   Timestamp: ${new Date(timestamp).toISOString()}`);

    // Update token using WhiskTokenStore (updates memory + .env + process.env)
    await WhiskTokenStore.setToken(token);

    // Save timestamp for extension status tracking
    const timestampPath = join(process.cwd(), '.whisk-token-timestamp');
    writeFileSync(timestampPath, Date.now().toString());

    console.log('✅ [Whisk Token] Token updated in memory and .env file');
    console.log('✅ [Whisk Token] Workers will use new token immediately!');

    return NextResponse.json({
      success: true,
      message: 'Token received and activated',
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('❌ [Whisk Token] Error:', error);
    return NextResponse.json(
      { error: 'Failed to save token' },
      { status: 500 }
    );
  }
}

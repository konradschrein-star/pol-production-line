import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

/**
 * GET /api/whisk/extension-status
 *
 * Check if Whisk Chrome extension is installed and active
 */
export async function GET() {
  try {
    // Check if we have a recent token in .env
    const envPath = path.join(process.cwd(), '.env');
    const envContent = await fs.readFile(envPath, 'utf-8');

    const tokenMatch = envContent.match(/WHISK_API_TOKEN=(.+)/);
    const token = tokenMatch ? tokenMatch[1].trim() : null;

    if (!token || token.length < 100) {
      return NextResponse.json({
        installed: false,
        extensionInstalled: false,
        active: false,
        lastTokenUpdate: null,
        message: 'No valid Whisk token found',
      });
    }

    // Check token file timestamp (if exists)
    const tokenTimestampPath = path.join(process.cwd(), '.whisk-token-timestamp');
    let lastTokenUpdate: number | null = null;

    try {
      const timestamp = await fs.readFile(tokenTimestampPath, 'utf-8');
      lastTokenUpdate = parseInt(timestamp, 10);
    } catch (error) {
      // No timestamp file - estimate from token itself
      // Google tokens start with timestamp-ish data
      lastTokenUpdate = null;
    }

    // Check if token is recent (within last hour)
    const isRecent = lastTokenUpdate ? Date.now() - lastTokenUpdate < 60 * 60 * 1000 : false;

    return NextResponse.json({
      installed: true, // If we have a token, extension likely worked
      extensionInstalled: true,
      active: isRecent || !!token,
      lastTokenUpdate,
      tokenPreview: token ? `${token.substring(0, 15)}...${token.substring(token.length - 10)}` : null,
    });
  } catch (error) {
    console.error('[Extension Status] Error:', error);
    return NextResponse.json(
      {
        installed: false,
        active: false,
        lastTokenUpdate: null,
        error: 'Failed to check status',
      },
      { status: 500 }
    );
  }
}

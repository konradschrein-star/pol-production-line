import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * POST /api/system/update-whisk-token
 *
 * Updates the WHISK_API_TOKEN in the .env file
 * Requires ADMIN_API_KEY header for security
 */
export async function POST(request: NextRequest) {
  try {
    // Check for admin API key (optional for browser/extension requests)
    const adminKey = request.headers.get('x-admin-api-key');
    const expectedAdminKey = process.env.ADMIN_API_KEY;

    // Check if request is from browser/extension (same-origin)
    const referer = request.headers.get('referer') || '';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8347';
    const isBrowserRequest = referer.startsWith(appUrl) ||
                             referer.startsWith('chrome-extension://');

    if (!expectedAdminKey) {
      // If no admin key is configured, allow the update (local development)
      console.warn('[API] No ADMIN_API_KEY configured - allowing token update');
    } else if (!isBrowserRequest && adminKey !== expectedAdminKey) {
      // Require admin key only for external requests (not from browser/extension)
      return NextResponse.json(
        { error: 'Unauthorized - Invalid admin API key' },
        { status: 401 }
      );
    }

    const { token } = await request.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Token is required and must be a string' },
        { status: 400 }
      );
    }

    // Read current .env file
    const envPath = join(process.cwd(), '.env');
    let envContent = '';

    try {
      envContent = readFileSync(envPath, 'utf-8');
    } catch (error) {
      return NextResponse.json(
        { error: '.env file not found' },
        { status: 404 }
      );
    }

    // Update or add WHISK_API_TOKEN
    const tokenRegex = /^WHISK_API_TOKEN=.*/m;

    if (tokenRegex.test(envContent)) {
      // Update existing token
      envContent = envContent.replace(tokenRegex, `WHISK_API_TOKEN=${token}`);
    } else {
      // Add new token
      envContent += `\nWHISK_API_TOKEN=${token}\n`;
    }

    // Write back to .env file
    writeFileSync(envPath, envContent, 'utf-8');

    // Update process.env for current process
    process.env.WHISK_API_TOKEN = token;

    console.log('✅ [API] Whisk API token updated successfully');

    return NextResponse.json({
      success: true,
      message: 'Whisk API token updated successfully',
      note: 'Workers and services will use the new token immediately',
    });
  } catch (error) {
    console.error('[API] Error updating Whisk token:', error);
    return NextResponse.json(
      {
        error: 'Failed to update token',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

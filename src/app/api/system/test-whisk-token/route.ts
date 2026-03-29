import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/system/test-whisk-token
 *
 * Tests if a Whisk API token is valid by making a lightweight API call
 */
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Token is required and must be a string' },
        { status: 400 }
      );
    }

    // Test the token by making a simple request to Whisk API
    const response = await fetch(
      'https://aisandbox-pa.googleapis.com/v1/whisk:generateImage',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: 'test validation',
          aspectRatio: 'SQUARE',
          // Minimal test payload
        }),
      }
    );

    if (response.status === 401 || response.status === 403) {
      return NextResponse.json(
        { error: 'Token is invalid or expired', status: response.status },
        { status: 401 }
      );
    }

    if (response.status === 400) {
      // 400 means the token is valid but the request format is wrong
      // This is actually good for validation purposes
      return NextResponse.json({
        success: true,
        message: 'Token is valid',
      });
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: `Whisk API returned status ${response.status}` },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Token is valid and working',
    });
  } catch (error) {
    console.error('[API] Error testing Whisk token:', error);
    return NextResponse.json(
      {
        error: 'Failed to test token',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

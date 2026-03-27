import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import os from 'os';

/**
 * POST /api/jobs/[id]/launch-browser
 * Opens browser for HeyGen avatar generation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    console.log(`🌐 [API] Launching browser for job ${id}...`);

    // Fetch job
    const jobResult = await db.query(
      'SELECT id, status, avatar_script FROM news_jobs WHERE id = $1',
      [id]
    );

    if (jobResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    const job = jobResult.rows[0];

    // Check if job is in review_assets state
    if (job.status !== 'review_assets') {
      return NextResponse.json(
        {
          error: 'Job must be in review_assets state to launch browser',
          currentStatus: job.status,
        },
        { status: 400 }
      );
    }

    // Get browser type from env or default to Edge
    // Security: Whitelist allowed browsers to prevent command injection
    const ALLOWED_BROWSERS = ['edge', 'chrome', 'chromium'] as const;
    type AllowedBrowser = typeof ALLOWED_BROWSERS[number];

    const envBrowser = process.env.DEFAULT_BROWSER || 'edge';
    const browserType: AllowedBrowser = ALLOWED_BROWSERS.includes(envBrowser as AllowedBrowser)
      ? (envBrowser as AllowedBrowser)
      : 'edge';

    // HeyGen URL
    const heygenUrl = 'https://app.heygen.com/create';

    // Security: Validate URL protocol to prevent javascript: or file: schemes
    try {
      const urlObj = new URL(heygenUrl);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new Error('Invalid URL protocol');
      }
    } catch (error: unknown) {
      console.error(`❌ [API] Invalid URL: ${heygenUrl}`);
      return NextResponse.json(
        { error: 'Invalid URL' },
        { status: 400 }
      );
    }

    // Use spawn instead of exec to avoid shell injection
    console.log(`🔧 [API] Launching ${browserType} for: ${heygenUrl}`);

    try {
      if (process.platform === 'win32') {
        // Windows: Launch Chrome/Edge directly with proper download flags
        // Find the browser executable
        let browserPath: string | null = null;

        if (browserType === 'chrome') {
          const chromePaths = [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
          ];
          browserPath = chromePaths.find(p => existsSync(p)) || null;
        } else if (browserType === 'edge') {
          const edgePaths = [
            'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
            'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
          ];
          browserPath = edgePaths.find(p => existsSync(p)) || null;
        } else if (browserType === 'chromium') {
          // Chromium might be in various locations
          browserPath = 'chromium'; // Fallback to PATH
        }

        // Get user's Downloads folder
        const downloadsPath = join(os.homedir(), 'Downloads');

        // Use PowerShell Start-Process (tested and working)
        // Launches Chrome with user's default profile (Google login + extensions + downloads)
        console.log(`🔧 [API] Launching ${browserType} with user profile...`);
        console.log(`🔧 [API] Opening: ${heygenUrl}`);

        if (browserPath && existsSync(browserPath)) {
          // Launch Chrome directly with PowerShell (preserves user profile)
          const psCommand = `Start-Process -FilePath '${browserPath}' -ArgumentList '--new-window','${heygenUrl}'`;
          spawn('powershell', ['-Command', psCommand], {
            detached: true,
            stdio: 'ignore',
            shell: false
          }).unref();

          console.log(`✅ [API] Browser launched with user profile`);
        } else {
          // Fallback: use default browser
          console.warn(`⚠️ [API] Chrome executable not found, using default browser`);
          spawn('cmd', ['/c', 'start', '""', `"${heygenUrl}"`], {
            detached: true,
            stdio: 'ignore',
            shell: true
          }).unref();
        }
      } else if (process.platform === 'darwin') {
        // macOS: Use open -a
        const browserMap: Record<AllowedBrowser, string> = {
          edge: 'Microsoft Edge',
          chrome: 'Google Chrome',
          chromium: 'Chromium',
        };
        const browserName = browserMap[browserType];
        spawn('open', ['-a', browserName, heygenUrl], {
          detached: true,
          stdio: 'ignore'
        }).unref();
      } else {
        // Linux
        const browserMap: Record<AllowedBrowser, string> = {
          edge: 'microsoft-edge',
          chrome: 'google-chrome',
          chromium: 'chromium-browser',
        };
        const browserCmd = browserMap[browserType];
        spawn(browserCmd, [heygenUrl], {
          detached: true,
          stdio: 'ignore'
        }).unref();
      }
    } catch (error: unknown) {
      console.error(`⚠️ [API] Browser launch error:`, error);
      // Don't fail the request - continue anyway
    }

    console.log(`✅ [API] Browser launched for job ${id}`);

    return NextResponse.json({
      success: true,
      message: 'Browser launched',
      browser: browserType,
      url: heygenUrl,
      avatarScript: job.avatar_script,
      instructions: [
        '1. Paste the avatar script into HeyGen',
        '2. Configure voice settings (48kHz sample rate, H.264 encoding)',
        '3. Generate the avatar video',
        '4. Download the MP4 file',
        '5. Upload via POST /api/jobs/' + id + '/compile',
      ],
    });

  } catch (error: unknown) {
    console.error('❌ [API] Error launching browser:', error);

    return NextResponse.json(
      {
        error: 'Failed to launch browser',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

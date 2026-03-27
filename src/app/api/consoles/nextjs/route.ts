/**
 * Next.js Dev Server Console Output API
 *
 * GET /api/consoles/nextjs - Get live Next.js dev server logs
 */

import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const OUTPUT_DIR = join(process.env.TEMP || 'C:\\Users\\konra\\AppData\\Local\\Temp', 'claude', 'C--Users-konra-OneDrive-Projekte-20260319-Political-content-automation', 'tasks');

export async function GET() {
  try {
    const nextjsFiles = ['b31c3fb.output']; // Known Next.js task ID

    for (const file of nextjsFiles) {
      const filePath = join(OUTPUT_DIR, file);

      if (existsSync(filePath)) {
        const content = readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        const last500Lines = lines.slice(-500).join('\n');

        return new NextResponse(last500Lines, {
          headers: {
            'Content-Type': 'text/plain',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        });
      }
    }

    return new NextResponse('Next.js dev server not running or log file not found', {
      headers: { 'Content-Type': 'text/plain' },
    });

  } catch (error) {
    console.error('[Consoles API] Error reading Next.js log:', error);
    return new NextResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

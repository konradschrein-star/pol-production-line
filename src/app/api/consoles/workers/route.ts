/**
 * Workers Console Output API
 *
 * GET /api/consoles/workers - Get live BullMQ worker logs
 */

import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Path to the worker output file (background task b4a6830 or latest)
const OUTPUT_DIR = join(process.env.TEMP || 'C:\\Users\\konra\\AppData\\Local\\Temp', 'claude', 'C--Users-konra-OneDrive-Projekte-20260319-Political-content-automation', 'tasks');

export async function GET() {
  try {
    // Try to find the latest worker output file
    const workerFiles = ['b4a6830.output', 'b7d4183.output']; // Known worker task IDs

    for (const file of workerFiles) {
      const filePath = join(OUTPUT_DIR, file);

      if (existsSync(filePath)) {
        // Read last 50KB of file (last ~500 lines)
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

    return new NextResponse('Workers not running or log file not found', {
      headers: { 'Content-Type': 'text/plain' },
    });

  } catch (error) {
    console.error('[Consoles API] Error reading workers log:', error);
    return new NextResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

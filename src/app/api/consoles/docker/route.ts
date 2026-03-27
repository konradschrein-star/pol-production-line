/**
 * Docker Console Output API
 *
 * GET /api/consoles/docker - Get live Docker container logs
 */

import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  try {
    // Get logs from both Docker containers
    const { stdout: postgresLogs } = await execAsync('docker logs --tail 200 obsidian-postgres 2>&1');
    const { stdout: redisLogs } = await execAsync('docker logs --tail 200 obsidian-redis 2>&1');

    const output = `
========================================
POSTGRES CONTAINER (obsidian-postgres)
========================================

${postgresLogs}

========================================
REDIS CONTAINER (obsidian-redis)
========================================

${redisLogs}
`.trim();

    return new NextResponse(output, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (error) {
    console.error('[Consoles API] Error reading Docker logs:', error);
    return new NextResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}\n\nMake sure Docker containers are running.`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

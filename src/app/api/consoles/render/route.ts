/**
 * Active Render Jobs Console Output API
 *
 * GET /api/consoles/render - Get logs from currently rendering jobs
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Get all jobs currently rendering
    const result = await db.query(
      `SELECT id, status, render_logs, created_at, updated_at
       FROM news_jobs
       WHERE status = 'rendering' OR (status IN ('failed', 'completed') AND updated_at > NOW() - INTERVAL '5 minutes')
       ORDER BY updated_at DESC
       LIMIT 5`
    );

    if (result.rows.length === 0) {
      return new NextResponse('No active or recent render jobs\n\nJobs will appear here when rendering starts.', {
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    let output = '';

    for (const job of result.rows) {
      output += `${'='.repeat(80)}\n`;
      output += `JOB: ${job.id}\n`;
      output += `STATUS: ${job.status.toUpperCase()}\n`;
      output += `STARTED: ${new Date(job.created_at).toLocaleString()}\n`;
      output += `UPDATED: ${new Date(job.updated_at).toLocaleString()}\n`;
      output += `${'='.repeat(80)}\n\n`;

      if (job.render_logs && Array.isArray(job.render_logs)) {
        for (const log of job.render_logs) {
          const timestamp = new Date(log.timestamp).toLocaleTimeString();
          const icon = log.type === 'error' ? '❌' : log.type === 'success' ? '✅' : log.type === 'warn' ? '⚠️' : 'ℹ️';
          output += `[${timestamp}] ${icon} ${log.message}\n`;
        }
      } else {
        output += '(No logs available)\n';
      }

      output += '\n\n';
    }

    return new NextResponse(output, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (error) {
    console.error('[Consoles API] Error reading render logs:', error);
    return new NextResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

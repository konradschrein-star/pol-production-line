/**
 * POST /api/settings - Update environment variables
 * WARNING: This writes to .env file - only use in local development
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';

export async function POST(req: NextRequest) {
  try {
    const settings = await req.json();
    const envPath = join(process.cwd(), '.env');

    // Read current .env
    let envContent = '';
    try {
      envContent = await readFile(envPath, 'utf-8');
    } catch {
      // .env doesn't exist yet, start fresh
      envContent = '';
    }

    // Update or add each setting
    const lines = envContent.split('\n');
    const updatedKeys = new Set<string>();

    for (const [key, value] of Object.entries(settings)) {
      if (!value || typeof value !== 'string') continue;

      updatedKeys.add(key);
      const lineIndex = lines.findIndex((line) =>
        line.trim().startsWith(`${key}=`)
      );

      if (lineIndex !== -1) {
        // Update existing
        lines[lineIndex] = `${key}=${value}`;
      } else {
        // Add new
        lines.push(`${key}=${value}`);
      }
    }

    // Write back to .env
    await writeFile(envPath, lines.join('\n'), 'utf-8');

    // Update process.env (for current session)
    for (const [key, value] of Object.entries(settings)) {
      if (value && typeof value === 'string') {
        process.env[key] = value;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Settings saved. Restart workers to apply changes.',
    });
  } catch (error) {
    console.error('Failed to save settings:', error);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}

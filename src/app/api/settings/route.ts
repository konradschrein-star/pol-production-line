/**
 * GET /api/settings - Read current environment variables
 * POST /api/settings - Update environment variables
 * WARNING: This writes to .env file - only use in local development
 *
 * Phase 8 Security Enhancements:
 * - IP whitelist (localhost only)
 * - Timing-safe admin key comparison
 * - Audit logging for all access attempts
 * - Stricter rate limiting (5/min) via middleware
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import crypto from 'crypto';
import { logAdminAccess } from '@/lib/security/audit-logger';

/**
 * GET - Load current settings from .env file
 */
export async function GET() {
  try {
    const envPath = join(process.cwd(), '.env');

    // Read .env file
    let envContent = '';
    try {
      envContent = await readFile(envPath, 'utf-8');
    } catch {
      // .env doesn't exist, return empty/defaults
      return NextResponse.json({
        AI_PROVIDER: process.env.AI_PROVIDER || 'google',
        ANTHROPIC_API_KEY: '',
        GOOGLE_AI_API_KEY: '',
        GROQ_API_KEY: '',
        WHISK_API_TOKEN: '',
        DATABASE_URL: process.env.DATABASE_URL || '',
        REDIS_HOST: process.env.REDIS_HOST || 'localhost',
        REDIS_PORT: process.env.REDIS_PORT || '6379',
        REDIS_PASSWORD: '',
        DEFAULT_BROWSER: process.env.DEFAULT_BROWSER || 'edge',
        AUTO_WHISK_EXTENSION_ID: process.env.AUTO_WHISK_EXTENSION_ID || 'gcgblhgncmhjchllkcpcneeibddhmbbe',
        AVATAR_MODE: process.env.AVATAR_MODE || 'manual',
        HEYGEN_PROFILE_PATH: process.env.HEYGEN_PROFILE_PATH || './integrations/heygen-automation/heygen-chrome-profile',
        PYTHON_EXECUTABLE: process.env.PYTHON_EXECUTABLE || 'python',
        REMOTION_TIMEOUT_MS: process.env.REMOTION_TIMEOUT_MS || '300000',
        REMOTION_CONCURRENCY: process.env.REMOTION_CONCURRENCY || '2',
      });
    }

    // Parse .env file
    const settings: Record<string, string> = {};
    const lines = envContent.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=');
        settings[key.trim()] = value.trim();
      }
    }

    // Return settings (mask sensitive values)
    return NextResponse.json({
      AI_PROVIDER: settings.AI_PROVIDER || 'google',
      ANTHROPIC_API_KEY: settings.ANTHROPIC_API_KEY ? maskApiKey(settings.ANTHROPIC_API_KEY) : '',
      GOOGLE_AI_API_KEY: settings.GOOGLE_AI_API_KEY ? maskApiKey(settings.GOOGLE_AI_API_KEY) : '',
      GROQ_API_KEY: settings.GROQ_API_KEY ? maskApiKey(settings.GROQ_API_KEY) : '',
      WHISK_API_TOKEN: settings.WHISK_API_TOKEN ? maskApiKey(settings.WHISK_API_TOKEN) : '',
      DATABASE_URL: settings.DATABASE_URL || '',
      REDIS_HOST: settings.REDIS_HOST || 'localhost',
      REDIS_PORT: settings.REDIS_PORT || '6379',
      REDIS_PASSWORD: settings.REDIS_PASSWORD ? '••••••••' : '',
      DEFAULT_BROWSER: settings.DEFAULT_BROWSER || 'edge',
      AUTO_WHISK_EXTENSION_ID: settings.AUTO_WHISK_EXTENSION_ID || 'gcgblhgncmhjchllkcpcneeibddhmbbe',
      AVATAR_MODE: settings.AVATAR_MODE || 'manual',
      HEYGEN_PROFILE_PATH: settings.HEYGEN_PROFILE_PATH || './integrations/heygen-automation/heygen-chrome-profile',
      PYTHON_EXECUTABLE: settings.PYTHON_EXECUTABLE || 'python',
      REMOTION_TIMEOUT_MS: settings.REMOTION_TIMEOUT_MS || '300000',
      REMOTION_CONCURRENCY: settings.REMOTION_CONCURRENCY || '2',
    });
  } catch (error) {
    console.error('Failed to load settings:', error);
    return NextResponse.json(
      { error: 'Failed to load settings' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to mask API keys (show first 8 chars only)
 */
function maskApiKey(key: string): string {
  if (key.length <= 8) return key;
  return key.substring(0, 8) + '••••••••••••';
}

/**
 * POST - Save settings to .env file
 */
export async function POST(req: NextRequest) {
  try {
    // Get IP address
    const ip =
      req.ip ||
      req.headers.get('x-forwarded-for')?.split(',')[0] ||
      req.headers.get('x-real-ip') ||
      'unknown';

    // 1. IP whitelist check (localhost-only deployment)
    if (ip !== '127.0.0.1' && ip !== '::1' && ip !== 'localhost') {
      console.warn(`⚠️ [SETTINGS] Access denied from non-localhost IP: ${ip}`);
      await logAdminAccess(ip, false, { reason: 'IP not whitelisted' });

      return NextResponse.json(
        { error: 'Forbidden', message: 'Admin endpoint only accessible from localhost' },
        { status: 403 }
      );
    }

    // 2. Admin API key check (timing-safe comparison)
    const adminKey = req.headers.get('x-admin-api-key');
    const validAdminKey = process.env.ADMIN_API_KEY;

    if (!adminKey || !validAdminKey) {
      console.warn('⚠️ [SETTINGS] Missing admin API key');
      await logAdminAccess(ip, false, { reason: 'Missing API key' });

      return NextResponse.json(
        { error: 'Unauthorized', message: 'Admin API key required' },
        { status: 401 }
      );
    }

    // Timing-safe comparison to prevent timing attacks
    try {
      const providedBuffer = Buffer.from(adminKey, 'utf-8');
      const validBuffer = Buffer.from(validAdminKey, 'utf-8');

      if (
        providedBuffer.length !== validBuffer.length ||
        !crypto.timingSafeEqual(providedBuffer, validBuffer)
      ) {
        console.warn('⚠️ [SETTINGS] Invalid admin API key');
        await logAdminAccess(ip, false, { reason: 'Invalid API key' });

        return NextResponse.json(
          { error: 'Unauthorized', message: 'Invalid admin API key' },
          { status: 401 }
        );
      }
    } catch (error) {
      console.error('[SETTINGS] Authentication error:', error);
      await logAdminAccess(ip, false, { reason: 'Authentication error' });

      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication error' },
        { status: 401 }
      );
    }

    const settings = await req.json();
    const envPath = join(process.cwd(), '.env');

    // Read current .env
    let envContent = '';
    try {
      envContent = await readFile(envPath, 'utf-8');
    } catch {
      // .env doesn't exist yet, create header
      envContent = '# Obsidian News Desk - Environment Configuration\n# Generated by Settings UI\n\n';
    }

    // Update or add each setting
    const lines = envContent.split('\n');
    const updatedKeys = new Set<string>();

    for (const [key, value] of Object.entries(settings)) {
      // Skip if value is empty or is a masked value (hasn't changed)
      if (!value || typeof value !== 'string') continue;
      if (value.includes('••••')) continue; // Skip masked passwords

      updatedKeys.add(key);
      const lineIndex = lines.findIndex((line) =>
        line.trim().startsWith(`${key}=`)
      );

      if (lineIndex !== -1) {
        // Update existing line
        lines[lineIndex] = `${key}=${value}`;
      } else {
        // Add new line
        lines.push(`${key}=${value}`);
      }
    }

    // Write back to .env
    await writeFile(envPath, lines.join('\n'), 'utf-8');

    console.log('✅ Settings saved to .env file');

    // Update process.env (for current session - worker restart still needed)
    for (const [key, value] of Object.entries(settings)) {
      if (value && typeof value === 'string' && !value.includes('••••')) {
        process.env[key] = value;
      }
    }

    // Log successful settings update
    await logAdminAccess(ip, true, {
      keys: Array.from(updatedKeys), // Don't log values (may contain secrets)
      count: updatedKeys.size,
    });

    return NextResponse.json({
      success: true,
      message: 'Settings saved. Restart workers to apply changes.',
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to save settings:', error);
    return NextResponse.json(
      {
        error: 'Failed to save settings',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

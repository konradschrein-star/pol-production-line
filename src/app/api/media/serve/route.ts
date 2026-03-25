import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { getBaseStoragePath, resolveStoragePath } from '@/lib/storage/path-resolver';

/**
 * GET /api/media/serve?path=...
 * Serves local media files (images, videos, thumbnails)
 * Security: Only serves files from configured storage directory
 *
 * Supports both relative and absolute paths (for backward compatibility):
 * - path=images/scene123.jpg (new, portable format)
 * - path=C:\Users\konra\ObsidianNewsDesk\images\scene123.jpg (legacy)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');

    if (!filePath) {
      return NextResponse.json(
        { error: 'Missing path parameter' },
        { status: 400 }
      );
    }

    // Resolve path (handles both relative and absolute for backward compatibility)
    const resolvedPath = path.isAbsolute(filePath)
      ? filePath // Legacy absolute path
      : resolveStoragePath(filePath); // New relative path

    // Security: Validate file path is within storage directory
    const allowedBaseDir = getBaseStoragePath();
    const normalizedPath = path.normalize(resolvedPath);
    const normalizedBase = path.normalize(allowedBaseDir);

    // Check if path is within allowed directory
    if (!normalizedPath.startsWith(normalizedBase)) {
      console.warn(`⚠️ [Media] Rejected unauthorized path: ${filePath}`);
      console.warn(`   Resolved to: ${normalizedPath}`);
      console.warn(`   Allowed base: ${normalizedBase}`);
      return NextResponse.json(
        { error: 'Unauthorized file path' },
        { status: 403 }
      );
    }

    // Check if file exists
    if (!existsSync(normalizedPath)) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Read file
    const buffer = await readFile(normalizedPath);

    // Determine content type based on file extension
    const ext = path.extname(normalizedPath).toLowerCase();
    const contentTypeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mov': 'video/quicktime',
    };

    const contentType = contentTypeMap[ext] || 'application/octet-stream';

    // Return file with appropriate headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
        'Content-Disposition': 'inline', // Display in browser, not download
      },
    });

  } catch (error) {
    console.error('❌ [Media] Error serving file:', error);

    return NextResponse.json(
      {
        error: 'Failed to serve file',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

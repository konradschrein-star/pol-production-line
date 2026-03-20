import { NextRequest, NextResponse } from 'next/server';
import { readFile, lstat } from 'fs/promises';
import { existsSync } from 'fs';
import { extname, resolve, normalize } from 'path';

/**
 * File Server API Route
 * Serves local files via HTTP for frontend display
 *
 * GET /api/files?path=C:\Users\konra\ObsidianNewsDesk\images\scene123.png
 *
 * Returns the file with correct content-type headers
 */

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
};

export async function GET(req: NextRequest) {
  try {
    // Get file path from query parameter
    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get('path');

    // Validate path parameter
    if (!filePath) {
      return new NextResponse('Missing path parameter', { status: 400 });
    }

    console.log(`📁 [Files API] Request for: ${filePath}`);

    // Security check: Prevent path traversal attacks
    const allowedBasePath = process.env.LOCAL_STORAGE_PATH || 'C:\\Users\\konra\\ObsidianNewsDesk';

    // Normalize and resolve paths to prevent .. attacks
    const normalizedPath = normalize(resolve(filePath));
    const normalizedBase = normalize(resolve(allowedBasePath));

    // Verify resolved path still starts with base directory
    if (!normalizedPath.startsWith(normalizedBase)) {
      console.error(`⛔ [Files API] Path traversal attempt blocked: ${filePath}`);
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Check if file exists
    if (!existsSync(normalizedPath)) {
      console.error(`❌ [Files API] File not found: ${normalizedPath}`);
      return new NextResponse('File not found', { status: 404 });
    }

    // Security: Reject symlinks to prevent following links outside allowed directory
    try {
      const stats = await lstat(normalizedPath);
      if (stats.isSymbolicLink()) {
        console.error(`⛔ [Files API] Symlink rejected: ${normalizedPath}`);
        return new NextResponse('Forbidden', { status: 403 });
      }
    } catch (error) {
      console.error(`❌ [Files API] Stat error:`, error);
      return new NextResponse('Internal server error', { status: 500 });
    }

    // Read file (use normalized path)
    const buffer = await readFile(normalizedPath);

    // Determine content type from extension
    const ext = extname(normalizedPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    console.log(`✅ [Files API] Serving ${normalizedPath} (${contentType}, ${buffer.length} bytes)`);

    // Return file with appropriate headers
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
        'Content-Length': buffer.length.toString(),
      },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [Files API] Error serving file:', error);

    // Don't expose error details to client in production
    const clientMessage = process.env.NODE_ENV === 'development'
      ? `Internal server error: ${errorMessage}`
      : 'Internal server error';

    return new NextResponse(clientMessage, { status: 500 });
  }
}

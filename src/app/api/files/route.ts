import { NextRequest, NextResponse } from 'next/server';
import { readFile, lstat } from 'fs/promises';
import { existsSync } from 'fs';
import { extname, resolve, normalize, isAbsolute } from 'path';
import { getBaseStoragePath, resolveStoragePath } from '@/lib/storage/path-resolver';

/**
 * File Server API Route
 * Serves local files via HTTP for frontend display
 *
 * Supports both relative and absolute paths (for backward compatibility):
 * - GET /api/files?path=images/scene123.png (new, portable format)
 * - GET /api/files?path=C:\Users\konra\ObsidianNewsDesk\images\scene123.png (legacy)
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
    const downloadFilename = searchParams.get('filename'); // Optional custom filename for downloads

    // Validate path parameter
    if (!filePath) {
      return new NextResponse('Missing path parameter', { status: 400 });
    }

    console.log(`📁 [Files API] Request for: ${filePath}`);
    if (downloadFilename) {
      console.log(`📝 [Files API] Custom download filename: ${downloadFilename}`);
    }

    // Resolve path (handles both relative and absolute for backward compatibility)
    const resolvedPath = isAbsolute(filePath)
      ? filePath // Legacy absolute path
      : resolveStoragePath(filePath); // New relative path

    // Security check: Prevent path traversal attacks
    const allowedBasePath = getBaseStoragePath();

    // Normalize and resolve paths to prevent .. attacks
    const normalizedPath = normalize(resolve(resolvedPath));
    const normalizedBase = normalize(resolve(allowedBasePath));

    // Verify resolved path still starts with base directory
    if (!normalizedPath.startsWith(normalizedBase)) {
      console.error(`⛔ [Files API] Path traversal attempt blocked: ${filePath}`);
      console.error(`   Resolved to: ${normalizedPath}`);
      console.error(`   Allowed base: ${normalizedBase}`);
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

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
      'Content-Length': buffer.length.toString(),
    };

    // Add Content-Disposition header for downloads with custom filename
    if (downloadFilename) {
      // Sanitize filename to prevent header injection
      const sanitizedFilename = downloadFilename.replace(/[^\w\s\-_.()]/g, '_');
      headers['Content-Disposition'] = `attachment; filename="${sanitizedFilename}"`;
      console.log(`📥 [Files API] Set download filename: ${sanitizedFilename}`);
    }

    // Return file with appropriate headers
    return new NextResponse(buffer, { headers });

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

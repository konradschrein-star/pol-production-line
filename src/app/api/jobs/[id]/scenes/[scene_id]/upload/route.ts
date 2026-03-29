import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { saveBuffer, checkDiskSpace } from '@/lib/storage/local';
import { validateImage, processImage } from '@/lib/utils/image-processing';
import { sceneIdParamsSchema, validateParams } from '@/lib/validation/schemas';

/**
 * POST /api/jobs/[id]/scenes/[scene_id]/upload
 * Manually upload an image to override auto-generated one
 * Now with Sharp validation and processing
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; scene_id: string } }
) {
  try {
    // SECURITY: Validate UUID parameters to prevent SQL injection
    const { id, scene_id } = validateParams(sceneIdParamsSchema, params);

    console.log(`📤 [API] Manual image upload for scene ${scene_id}...`);

    // Check scene exists
    const sceneResult = await db.query(
      'SELECT id FROM news_scenes WHERE id = $1 AND job_id = $2',
      [scene_id, id]
    );

    if (sceneResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Scene not found or does not belong to this job' },
        { status: 404 }
      );
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided. Use field name "image"' },
        { status: 400 }
      );
    }

    // Validate file type (MIME type check)
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error: 'Invalid file type. Allowed: PNG, JPEG, WebP',
          receivedType: file.type,
        },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB to prevent abuse)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(2);
      return NextResponse.json(
        {
          error: `File too large (${sizeMB}MB). Maximum size is 10MB.`,
        },
        { status: 400 }
      );
    }

    // CRITICAL: Check disk space before accepting upload (Bug #8 fix)
    const diskSpaceCheck = checkDiskSpace(500); // Require 500MB free
    if (!diskSpaceCheck.available) {
      return NextResponse.json(
        {
          error: `Insufficient disk space. Available: ${diskSpaceCheck.availableMB.toFixed(0)}MB, Required: ${diskSpaceCheck.requiredMB}MB.`,
          path: diskSpaceCheck.path,
        },
        { status: 507 } // 507 Insufficient Storage
      );
    }

    console.log(`📦 [API] Processing file: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
    console.log(`💾 [API] Disk space: ${diskSpaceCheck.availableMB.toFixed(0)}MB available`);

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // SECURITY: Validate image magic bytes (basic check before Sharp processing)
    if (buffer.length < 4) {
      return NextResponse.json(
        { error: 'File too small to be a valid image' },
        { status: 400 }
      );
    }

    const magicBytes = buffer.slice(0, 4);
    const isPNG = magicBytes[0] === 0x89 && magicBytes[1] === 0x50 && magicBytes[2] === 0x4E && magicBytes[3] === 0x47;
    const isJPEG = magicBytes[0] === 0xFF && magicBytes[1] === 0xD8 && magicBytes[2] === 0xFF;
    const isWebP = buffer.slice(0, 4).toString('ascii') === 'RIFF' && buffer.slice(8, 12).toString('ascii') === 'WEBP';

    if (!isPNG && !isJPEG && !isWebP) {
      return NextResponse.json(
        {
          error: 'File does not appear to be a valid image (invalid file signature)',
          hint: 'Please upload a genuine PNG, JPEG, or WebP file',
        },
        { status: 400 }
      );
    }

    console.log(`✅ [API] File signature validated (${isPNG ? 'PNG' : isJPEG ? 'JPEG' : 'WebP'})`);

    // Validate image with Sharp
    const validation = await validateImage(buffer);

    if (!validation.valid) {
      console.error(`❌ [API] Image validation failed:`, validation.errors);
      return NextResponse.json(
        {
          error: 'Image validation failed',
          details: validation.errors.join(', '),
          validation,
        },
        { status: 400 }
      );
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      console.warn(`⚠️ [API] Image warnings:`, validation.warnings);
    }

    // Process image: resize to 1920x1080, optimize, convert to JPEG
    const processedBuffer = await processImage(buffer, {
      resize: true,
      optimize: true,
      targetWidth: 1920,
      targetHeight: 1080,
      quality: 90,
    });

    // Save processed image to local storage (always as .jpg)
    const filename = `${scene_id}.jpg`;
    const localPath = await saveBuffer(processedBuffer, filename, 'images');

    // Update scene in database with LOCAL PATH
    await db.query(
      'UPDATE news_scenes SET image_url = $1, generation_status = $2 WHERE id = $3',
      [localPath, 'completed', scene_id]
    );

    console.log(`✅ [API] Scene ${scene_id} image processed and saved: ${localPath}`);

    return NextResponse.json({
      success: true,
      message: 'Image processed and saved successfully',
      scene_id,
      image_url: localPath,
      file_name: file.name,
      original_size: file.size,
      processed_size: processedBuffer.length,
      resolution: '1920x1080',
      validation: {
        original_width: validation.width,
        original_height: validation.height,
        warnings: validation.warnings,
      },
    });

  } catch (error: unknown) {
    console.error('❌ [API] Error uploading image:', error);

    return NextResponse.json(
      {
        error: 'Failed to upload image',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

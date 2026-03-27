import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { WhiskReferenceType } from '@/lib/whisk/types';

/**
 * Get storage path for reference images
 */
function getReferenceStoragePath(): string {
  const storageRoot = process.env.LOCAL_STORAGE_ROOT || 'C:\\Users\\konra\\ObsidianNewsDesk';
  const refPath = join(storageRoot, 'images', 'references');

  // Ensure directory exists
  if (!existsSync(refPath)) {
    mkdirSync(refPath, { recursive: true });
  }

  return refPath;
}

/**
 * POST - Upload a reference image for a scene
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; scene_id: string } }
) {
  try {
    const { id: jobId, scene_id: sceneId } = params;
    const formData = await request.formData();

    // Validate reference type
    const type = formData.get('type') as string;
    if (!['subject', 'scene', 'style'].includes(type)) {
      return NextResponse.json(
        { error: 'type must be: subject, scene, or style' },
        { status: 400 }
      );
    }

    // Get uploaded file
    const file = formData.get('image') as File;
    if (!file) {
      return NextResponse.json(
        { error: 'Missing image file' },
        { status: 400 }
      );
    }

    // Validate file type (MIME type check)
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid type. Allowed: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB for reference images)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(2);
      return NextResponse.json(
        { error: `File too large (${sizeMB}MB). Maximum size is 5MB.` },
        { status: 400 }
      );
    }

    console.log(`📤 [REFERENCES] Uploading ${type} reference for scene ${sceneId}`);

    // Convert to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // SECURITY: Validate image magic bytes
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

    console.log(`✅ [REFERENCES] File signature validated (${isPNG ? 'PNG' : isJPEG ? 'JPEG' : 'WebP'})`);

    // Save to local storage
    const storageDir = getReferenceStoragePath();
    const ext = file.type.split('/')[1] || 'png';
    const filename = `${sceneId}_ref_${type}.${ext}`;
    const localPath = join(storageDir, filename);

    writeFileSync(localPath, buffer);

    console.log(`💾 [REFERENCES] Saved to: ${localPath}`);

    // Update database (merge with existing references)
    const currentScene = await db.query(
      'SELECT reference_images FROM news_scenes WHERE id = $1 AND job_id = $2',
      [sceneId, jobId]
    );

    if (currentScene.rows.length === 0) {
      return NextResponse.json({ error: 'Scene not found' }, { status: 404 });
    }

    const existingRefs = currentScene.rows[0].reference_images || {};
    const updatedRefs = {
      ...existingRefs,
      [type]: localPath,
    };

    await db.query(
      'UPDATE news_scenes SET reference_images = $1 WHERE id = $2',
      [JSON.stringify(updatedRefs), sceneId]
    );

    console.log(`✅ [REFERENCES] Database updated`);

    return NextResponse.json({
      success: true,
      scene_id: sceneId,
      reference_type: type,
      image_url: localPath,
    });

  } catch (error: any) {
    console.error('❌ [REFERENCES] Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove a reference image
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; scene_id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (!type || !['subject', 'scene', 'style'].includes(type)) {
      return NextResponse.json(
        { error: 'Query param "type" required (subject/scene/style)' },
        { status: 400 }
      );
    }

    const { id: jobId, scene_id: sceneId } = params;

    console.log(`🗑️ [REFERENCES] Removing ${type} reference for scene ${sceneId}`);

    // Get current references
    const result = await db.query(
      'SELECT reference_images FROM news_scenes WHERE id = $1 AND job_id = $2',
      [sceneId, jobId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Scene not found' }, { status: 404 });
    }

    const existingRefs = result.rows[0].reference_images || {};
    const updatedRefs = { ...existingRefs };
    delete updatedRefs[type];

    // Update database (NULL if no references left)
    await db.query(
      'UPDATE news_scenes SET reference_images = $1 WHERE id = $2',
      [
        Object.keys(updatedRefs).length > 0 ? JSON.stringify(updatedRefs) : null,
        sceneId,
      ]
    );

    console.log(`✅ [REFERENCES] ${type} reference removed`);

    return NextResponse.json({ success: true, removed: type });

  } catch (error: any) {
    console.error('❌ [REFERENCES] Delete error:', error);
    return NextResponse.json(
      { error: error.message || 'Delete failed' },
      { status: 500 }
    );
  }
}

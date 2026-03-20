import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { saveBuffer } from '@/lib/storage/local';

/**
 * POST /api/jobs/[id]/scenes/[scene_id]/upload
 * Manually upload an image to override auto-generated one
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; scene_id: string } }
) {
  try {
    const { id, scene_id } = params;

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

    // Validate file type
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

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: 'File too large. Maximum size: 10MB',
          receivedSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
        },
        { status: 400 }
      );
    }

    console.log(`📦 [API] Saving file: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save to local storage
    const extension = file.type.split('/')[1] || 'png';
    const filename = `${scene_id}.${extension}`;
    const localPath = await saveBuffer(buffer, 'images', filename);

    // Update scene in database with LOCAL PATH
    await db.query(
      'UPDATE news_scenes SET image_url = $1, generation_status = $2 WHERE id = $3',
      [localPath, 'completed', scene_id]
    );

    console.log(`✅ [API] Scene ${scene_id} image saved: ${localPath}`);

    return NextResponse.json({
      success: true,
      message: 'Image saved successfully to local storage',
      scene_id,
      image_url: localPath,
      file_name: file.name,
      file_size: file.size,
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

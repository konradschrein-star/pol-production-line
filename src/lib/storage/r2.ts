import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { readFileSync } from 'fs';

// Initialize S3 client for Cloudflare R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

/**
 * Upload a file to Cloudflare R2
 * @param filePath - Local file path to upload
 * @param key - Object key in R2 (e.g., "scenes/abc123.png")
 * @param contentType - MIME type of the file
 * @returns Public URL of the uploaded file
 */
export async function uploadToR2(
  filePath: string,
  key: string,
  contentType: string
): Promise<string> {
  try {
    console.log(`📤 [R2] Uploading ${filePath} to ${key}...`);

    // Read file
    const fileBuffer = readFileSync(filePath);

    // Upload to R2
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    });

    await s3Client.send(command);

    // Construct public URL
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

    console.log(`✅ [R2] Uploaded successfully: ${publicUrl}`);

    return publicUrl;
  } catch (error) {
    console.error(`❌ [R2] Upload failed for ${key}:`, error);
    throw new Error(`R2 upload failed: ${error.message}`);
  }
}

/**
 * Upload a buffer to Cloudflare R2
 * @param buffer - File buffer to upload
 * @param key - Object key in R2
 * @param contentType - MIME type
 * @returns Public URL of the uploaded file
 */
export async function uploadBufferToR2(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  try {
    console.log(`📤 [R2] Uploading buffer to ${key}...`);

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await s3Client.send(command);

    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

    console.log(`✅ [R2] Buffer uploaded successfully: ${publicUrl}`);

    return publicUrl;
  } catch (error) {
    console.error(`❌ [R2] Buffer upload failed for ${key}:`, error);
    throw new Error(`R2 buffer upload failed: ${error.message}`);
  }
}

/**
 * Generate a presigned URL for private R2 objects
 * @param key - Object key in R2
 * @param expiresIn - Expiration time in seconds (default: 3600)
 * @returns Presigned URL
 */
export async function getPresignedUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });

    return url;
  } catch (error) {
    console.error(`❌ [R2] Failed to generate presigned URL for ${key}:`, error);
    throw new Error(`R2 presigned URL generation failed: ${error.message}`);
  }
}

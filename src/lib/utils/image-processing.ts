import sharp from 'sharp';

/**
 * Image Processing Utility with Sharp
 * Provides validation, resizing, and optimization for scene images
 */

// Configuration
const TARGET_WIDTH = 1920;
const TARGET_HEIGHT = 1080;
const MIN_WIDTH = 1280;
const MIN_HEIGHT = 720;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const TARGET_ASPECT_RATIO = 16 / 9;
const ASPECT_RATIO_TOLERANCE = 0.02; // 2% tolerance
const JPEG_QUALITY = 90;

export interface ImageValidationResult {
  valid: boolean;
  width?: number;
  height?: number;
  format?: string;
  size?: number;
  errors: string[];
  warnings: string[];
}

export interface ImageProcessingOptions {
  resize?: boolean;
  optimize?: boolean;
  targetWidth?: number;
  targetHeight?: number;
  quality?: number;
}

/**
 * Validate image buffer against requirements
 * Checks resolution, aspect ratio, file size, and format
 */
export async function validateImage(buffer: Buffer): Promise<ImageValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Get image metadata
    const metadata = await sharp(buffer).metadata();
    const { width, height, format, size } = metadata;

    // Check if metadata is complete
    if (!width || !height || !format) {
      errors.push('Unable to read image metadata. File may be corrupt.');
      return { valid: false, errors, warnings };
    }

    // Check file size
    const fileSize = size || buffer.length;
    if (fileSize > MAX_FILE_SIZE) {
      errors.push(
        `File too large: ${(fileSize / 1024 / 1024).toFixed(2)}MB. Maximum: 10MB`
      );
    }

    // Check format
    const validFormats = ['jpeg', 'jpg', 'png', 'webp'];
    if (!validFormats.includes(format.toLowerCase())) {
      errors.push(`Invalid format: ${format}. Allowed: JPG, PNG, WebP`);
    }

    // Check minimum resolution
    if (width < MIN_WIDTH || height < MIN_HEIGHT) {
      errors.push(
        `Resolution too low: ${width}x${height}. Minimum: ${MIN_WIDTH}x${MIN_HEIGHT}`
      );
    }

    // Check aspect ratio
    const aspectRatio = width / height;
    const aspectRatioDiff = Math.abs(aspectRatio - TARGET_ASPECT_RATIO);

    if (aspectRatioDiff > ASPECT_RATIO_TOLERANCE) {
      warnings.push(
        `Non-standard aspect ratio: ${aspectRatio.toFixed(2)}:1. Will be cropped to 16:9`
      );
    }

    // Check if image needs resizing
    if (width !== TARGET_WIDTH || height !== TARGET_HEIGHT) {
      warnings.push(
        `Image will be resized from ${width}x${height} to ${TARGET_WIDTH}x${TARGET_HEIGHT}`
      );
    }

    return {
      valid: errors.length === 0,
      width,
      height,
      format,
      size: fileSize,
      errors,
      warnings,
    };
  } catch (error) {
    errors.push(
      `Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return { valid: false, errors, warnings };
  }
}

/**
 * Process image buffer with Sharp
 * Resizes to 1920x1080, optimizes quality, converts to JPEG
 */
export async function processImage(
  buffer: Buffer,
  options: ImageProcessingOptions = {}
): Promise<Buffer> {
  const {
    resize = true,
    optimize = true,
    targetWidth = TARGET_WIDTH,
    targetHeight = TARGET_HEIGHT,
    quality = JPEG_QUALITY,
  } = options;

  try {
    let pipeline = sharp(buffer);

    // Resize with cover fit (maintains aspect ratio, crops to fit)
    if (resize) {
      pipeline = pipeline.resize(targetWidth, targetHeight, {
        fit: 'cover',
        position: 'center',
      });
    }

    // Optimize and convert to JPEG
    if (optimize) {
      pipeline = pipeline.jpeg({
        quality,
        progressive: true,
        mozjpeg: true,
      });
    }

    // Execute pipeline
    const processedBuffer = await pipeline.toBuffer();

    console.log(`✅ [ImageProcessing] Image processed successfully`);
    console.log(`   Original size: ${(buffer.length / 1024).toFixed(2)} KB`);
    console.log(`   Processed size: ${(processedBuffer.length / 1024).toFixed(2)} KB`);
    console.log(`   Target resolution: ${targetWidth}x${targetHeight}`);

    return processedBuffer;
  } catch (error) {
    console.error('❌ [ImageProcessing] Failed to process image:', error);
    throw new Error(
      `Image processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Generate a gray placeholder image for failed generations
 * Creates a 1920x1080 solid gray image with text overlay
 */
export async function generatePlaceholder(text: string = 'Image Generation Failed'): Promise<Buffer> {
  try {
    // Create SVG with text
    const svg = `
      <svg width="${TARGET_WIDTH}" height="${TARGET_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#2a2a2a"/>
        <text
          x="50%"
          y="50%"
          font-family="Arial, sans-serif"
          font-size="48"
          font-weight="bold"
          fill="#666666"
          text-anchor="middle"
          dominant-baseline="middle"
        >${text}</text>
      </svg>
    `;

    const buffer = await sharp(Buffer.from(svg))
      .jpeg({ quality: 90 })
      .toBuffer();

    console.log(`✅ [ImageProcessing] Placeholder generated: ${text}`);
    return buffer;
  } catch (error) {
    console.error('❌ [ImageProcessing] Failed to generate placeholder:', error);
    throw new Error(
      `Placeholder generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Extract image dimensions without processing
 */
export async function getImageDimensions(
  buffer: Buffer
): Promise<{ width: number; height: number } | null> {
  try {
    const metadata = await sharp(buffer).metadata();
    if (!metadata.width || !metadata.height) {
      return null;
    }
    return {
      width: metadata.width,
      height: metadata.height,
    };
  } catch (error) {
    console.error('❌ [ImageProcessing] Failed to get dimensions:', error);
    return null;
  }
}

/**
 * Batch validate multiple images
 * Returns array of validation results
 */
export async function batchValidateImages(
  buffers: Buffer[]
): Promise<ImageValidationResult[]> {
  const results = await Promise.all(buffers.map((buffer) => validateImage(buffer)));

  const validCount = results.filter((r) => r.valid).length;
  console.log(`✅ [ImageProcessing] Batch validation complete: ${validCount}/${buffers.length} valid`);

  return results;
}

/**
 * Batch process multiple images
 * Returns array of processed buffers
 */
export async function batchProcessImages(
  buffers: Buffer[],
  options?: ImageProcessingOptions
): Promise<Buffer[]> {
  const processed = await Promise.all(buffers.map((buffer) => processImage(buffer, options)));

  console.log(`✅ [ImageProcessing] Batch processing complete: ${processed.length} images`);

  return processed;
}

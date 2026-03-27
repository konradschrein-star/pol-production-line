/**
 * Test Script for Image Processing with Sharp
 * Tests validation, processing, and batch operations
 */

import {
  validateImage,
  processImage,
  generatePlaceholder,
  getImageDimensions,
  batchValidateImages,
} from '../src/lib/utils/image-processing';
import fs from 'fs/promises';
import path from 'path';

async function main() {
  console.log('\n=== Image Processing Test Suite ===\n');

  // Test 1: Generate and validate placeholder
  console.log('Test 1: Generate Placeholder Image');
  try {
    const placeholder = await generatePlaceholder('Test Placeholder');
    const dimensions = await getImageDimensions(placeholder);
    console.log('✅ Placeholder generated:', dimensions);

    // Save for visual inspection
    const placeholderPath = path.join(process.cwd(), 'test-placeholder.jpg');
    await fs.writeFile(placeholderPath, placeholder);
    console.log(`   Saved to: ${placeholderPath}`);
  } catch (error) {
    console.error('❌ Placeholder test failed:', error);
  }

  console.log('\n---\n');

  // Test 2: Create test images with different properties
  console.log('Test 2: Create and Validate Test Images');

  // Test image 1: Valid 1920x1080
  try {
    const validImage = await createTestImage(1920, 1080);
    const validation = await validateImage(validImage);
    console.log('Valid Image (1920x1080):', validation);

    if (validation.valid) {
      console.log('✅ Valid image passed validation');
    } else {
      console.log('❌ Valid image failed validation');
    }
  } catch (error) {
    console.error('❌ Valid image test failed:', error);
  }

  console.log('\n---\n');

  // Test image 2: Low resolution (800x600)
  try {
    const lowResImage = await createTestImage(800, 600);
    const validation = await validateImage(lowResImage);
    console.log('Low Resolution (800x600):', validation);

    if (!validation.valid) {
      console.log('✅ Low-res image correctly rejected');
    } else {
      console.log('❌ Low-res image should have been rejected');
    }
  } catch (error) {
    console.error('❌ Low-res test failed:', error);
  }

  console.log('\n---\n');

  // Test image 3: Wrong aspect ratio (1920x1200)
  try {
    const wrongAspect = await createTestImage(1920, 1200);
    const validation = await validateImage(wrongAspect);
    console.log('Wrong Aspect Ratio (1920x1200):', validation);

    if (validation.warnings && validation.warnings.length > 0) {
      console.log('✅ Aspect ratio warning generated correctly');
    }
  } catch (error) {
    console.error('❌ Aspect ratio test failed:', error);
  }

  console.log('\n---\n');

  // Test 3: Image Processing
  console.log('Test 3: Image Processing (Resize & Optimize)');
  try {
    const testImage = await createTestImage(2560, 1440);
    const originalSize = testImage.length;

    const processed = await processImage(testImage, {
      resize: true,
      optimize: true,
      targetWidth: 1920,
      targetHeight: 1080,
      quality: 90,
    });

    const processedSize = processed.length;
    const dimensions = await getImageDimensions(processed);

    console.log('Original size:', (originalSize / 1024).toFixed(2), 'KB');
    console.log('Processed size:', (processedSize / 1024).toFixed(2), 'KB');
    console.log('Dimensions:', dimensions);

    if (dimensions?.width === 1920 && dimensions?.height === 1080) {
      console.log('✅ Image processed correctly');
    } else {
      console.log('❌ Image dimensions incorrect');
    }

    // Save for visual inspection
    const processedPath = path.join(process.cwd(), 'test-processed.jpg');
    await fs.writeFile(processedPath, processed);
    console.log(`   Saved to: ${processedPath}`);
  } catch (error) {
    console.error('❌ Processing test failed:', error);
  }

  console.log('\n---\n');

  // Test 4: Batch Validation
  console.log('Test 4: Batch Validation');
  try {
    const images = [
      await createTestImage(1920, 1080),
      await createTestImage(800, 600),
      await createTestImage(3840, 2160),
      await createTestImage(1280, 720),
    ];

    const results = await batchValidateImages(images);
    const validCount = results.filter((r) => r.valid).length;

    console.log(`Validated ${results.length} images: ${validCount} valid, ${results.length - validCount} invalid`);

    results.forEach((result, index) => {
      console.log(`  Image ${index + 1}: ${result.valid ? '✅' : '❌'} ${result.width}x${result.height}`);
      if (result.errors.length > 0) {
        console.log(`    Errors: ${result.errors.join(', ')}`);
      }
    });

    console.log('✅ Batch validation completed');
  } catch (error) {
    console.error('❌ Batch validation failed:', error);
  }

  console.log('\n=== All Tests Complete ===\n');
}

/**
 * Helper: Create a test image with Sharp
 */
async function createTestImage(width: number, height: number): Promise<Buffer> {
  const sharp = require('sharp');

  // Create SVG
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#3498db"/>
      <text
        x="50%"
        y="50%"
        font-family="Arial"
        font-size="48"
        fill="white"
        text-anchor="middle"
        dominant-baseline="middle"
      >${width}x${height}</text>
    </svg>
  `;

  return sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
}

// Run tests
main().catch(console.error);

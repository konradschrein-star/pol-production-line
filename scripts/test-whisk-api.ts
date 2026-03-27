/**
 * Test Whisk API with bearer token
 *
 * Usage: npm run test:whisk
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env file
config({ path: resolve(__dirname, '../.env') });

import { WhiskAPIClient } from '../src/lib/whisk/api';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function testWhiskAPI() {
  console.log('\n🧪 WHISK API TEST\n');

  // Check if token is configured
  if (!process.env.WHISK_API_TOKEN) {
    console.error('❌ WHISK_API_TOKEN not set in .env');
    console.error('\n📋 TO FIX:');
    console.error('1. Open https://labs.google.com/whisk in your browser');
    console.error('2. Press F12 → Network tab');
    console.error('3. Generate a test image');
    console.error('4. Find the API request and copy the Authorization Bearer token');
    console.error('5. Add to .env: WHISK_API_TOKEN=your_token_here\n');
    console.error('See: docs/WHISK_TOKEN_SETUP.md for detailed instructions\n');
    process.exit(1);
  }

  console.log('✅ Token found in environment\n');

  try {
    const client = new WhiskAPIClient();

    console.log('🎨 Generating test image...');
    console.log('   Prompt: "A beautiful sunset over mountains, digital art style"');
    console.log('   Aspect Ratio: LANDSCAPE (16:9)');
    console.log('   Number of Images: 1\n');

    const result = await client.generateImage({
      prompt: 'A beautiful sunset over mountains, digital art style, vibrant colors',
      aspectRatio: 'IMAGE_ASPECT_RATIO_LANDSCAPE',
    });

    console.log('✅ Generation successful!');
    console.log(`   Status: ${result.status}`);
    console.log(`   Images: ${result.images.length}\n`);

    if (result.images.length > 0) {
      const image = result.images[0];

      console.log('📥 Decoding image from base64...');
      const imageBuffer = await client.downloadImage(image.url, image.base64);

      const outputPath = join(process.cwd(), 'test-whisk-output.jpg');
      writeFileSync(outputPath, imageBuffer);

      console.log(`✅ Image saved: ${outputPath}\n`);
      console.log('🎉 TEST PASSED!\n');
      console.log('Your Whisk API token is working correctly.');
      console.log('The image generation pipeline is ready to use.\n');
    } else {
      console.warn('⚠️  No images in response');
      console.warn('   The API call succeeded but returned no images.');
      console.warn('   This might be normal depending on the API response format.\n');
    }

  } catch (error) {
    console.error('\n❌ TEST FAILED\n');

    if (error instanceof Error) {
      console.error('Error:', error.message);

      if (error.message.includes('401')) {
        console.error('\n🔐 Authentication Error:');
        console.error('   Your token may be expired or invalid.');
        console.error('   Please get a fresh token from the browser (F12 → Network).\n');
      } else if (error.message.includes('404')) {
        console.error('\n🔗 Endpoint Error:');
        console.error('   The API endpoint may be incorrect.');
        console.error('   Please verify WHISK_API_BASE_URL and WHISK_API_ENDPOINT in .env');
        console.error('   Check the actual request URL in the Network tab.\n');
      } else if (error.message.includes('WHISK_API_TOKEN')) {
        console.error('\n⚙️  Configuration Error:');
        console.error('   Please add your token to .env file.\n');
      }
    }

    console.error('Full error:', error);
    process.exit(1);
  }
}

testWhiskAPI().catch(console.error);

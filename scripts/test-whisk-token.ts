#!/usr/bin/env tsx
/**
 * Whisk API Token Validator
 * Tests if the current token is valid by making a test API call
 */

import 'dotenv/config';
import fetch from 'node-fetch';

const WHISK_API_ENDPOINT = 'https://aisandbox-pa.googleapis.com/v1/whisk:generateImage';
const TEST_PROMPT = 'A simple red circle on white background';

async function testWhiskToken() {
  console.log('🔍 Testing Whisk API token...\n');

  const token = process.env.WHISK_API_TOKEN;

  if (!token) {
    console.error('❌ WHISK_API_TOKEN not found in .env file');
    console.log('\nFix:');
    console.log('  1. Open .env file');
    console.log('  2. Add: WHISK_API_TOKEN=your_token_here');
    console.log('\nSee TROUBLESHOOTING.md for token refresh instructions');
    process.exit(1);
  }

  if (!token.startsWith('ya29.')) {
    console.error('❌ Invalid token format');
    console.log(`   Expected: ya29.XXX...`);
    console.log(`   Got: ${token.substring(0, 10)}...`);
    console.log('\nSee TROUBLESHOOTING.md for token refresh instructions');
    process.exit(1);
  }

  console.log(`✅ Token format valid: ${token.substring(0, 15)}...`);
  console.log('   Testing API access...\n');

  try {
    const response = await fetch(WHISK_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        imagePrompt: TEST_PROMPT,
        aspectRatio: 'SQUARE',
        imageModel: 'IMAGEN_3_0',
      }),
      timeout: 30000,
    });

    const data: any = await response.json();

    if (response.ok && data.generatedImage) {
      console.log('✅ Whisk API token is VALID');
      console.log(`   Generated test image: ${data.generatedImage.imageUri.substring(0, 50)}...`);
      console.log('\n🎉 Token is working correctly!');
      console.log('   Token will expire in ~1 hour from when it was generated.');
      process.exit(0);
    } else if (response.status === 401) {
      console.error('❌ Token EXPIRED or INVALID (401 Unauthorized)');
      console.log('\nFix: Refresh token following these steps:');
      console.log('  1. Open https://labs.google.com/whisk in browser');
      console.log('  2. F12 → Network tab');
      console.log('  3. Generate test image');
      console.log('  4. Find "generateImage" request');
      console.log('  5. Copy Authorization Bearer token');
      console.log('  6. Update .env: WHISK_API_TOKEN=XXX');
      console.log('\nSee TROUBLESHOOTING.md for detailed instructions');
      process.exit(1);
    } else if (response.status === 429) {
      console.error('❌ Rate limit exceeded (429 Too Many Requests)');
      console.log('\nToken is valid but you are rate-limited.');
      console.log('Wait a few minutes before trying again.');
      process.exit(1);
    } else {
      console.error(`❌ Unexpected response: ${response.status} ${response.statusText}`);
      console.log('\nAPI Response:');
      console.log(JSON.stringify(data, null, 2));
      process.exit(1);
    }
  } catch (error: any) {
    if (error.type === 'request-timeout') {
      console.error('❌ Request timeout (30s)');
      console.log('\nWhisk API may be down. Try again later.');
    } else {
      console.error('❌ Network error:', error.message);
    }
    process.exit(1);
  }
}

testWhiskToken();

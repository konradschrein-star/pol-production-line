#!/usr/bin/env tsx
/**
 * Test automatic token refresh functionality
 *
 * This will:
 * 1. Check Chrome profile accessibility
 * 2. Launch browser with your profile
 * 3. Navigate to Whisk
 * 4. Attempt to capture a token
 */

import dotenv from 'dotenv';
import { WhiskTokenRefresher } from '../src/lib/whisk/token-refresh.js';
import fs from 'fs';

dotenv.config();

async function testTokenRefresh() {
  console.log('🧪 Testing Automatic Token Refresh\n');
  console.log('='.repeat(80));

  // Step 1: Check Chrome profile
  console.log('\n📂 Step 1: Checking Chrome profile...\n');

  const profilePaths = [
    'C:\\Users\\konra\\AppData\\Local\\Google\\Chrome\\User Data',
    process.env.CHROME_PROFILE_PATH,
  ].filter(Boolean);

  let foundProfile = null;
  for (const path of profilePaths) {
    if (path && fs.existsSync(path)) {
      console.log(`✅ Found Chrome profile: ${path}`);
      foundProfile = path;
      break;
    } else {
      console.log(`❌ Not found: ${path}`);
    }
  }

  if (!foundProfile) {
    console.error('\n❌ Chrome profile not found!');
    console.error('\nTroubleshooting:');
    console.error('1. Make sure Chrome is installed');
    console.error('2. Check if profile path exists:');
    profilePaths.forEach(p => console.error(`   ${p}`));
    console.error('3. Set custom path in .env: CHROME_PROFILE_PATH=...');
    process.exit(1);
  }

  // Step 2: Check current token
  console.log('\n🔑 Step 2: Checking current token...\n');

  const currentToken = process.env.WHISK_API_TOKEN;
  if (!currentToken) {
    console.error('❌ No token found in .env');
  } else {
    console.log(`✅ Current token: ${currentToken.substring(0, 20)}...`);
    console.log(`   Length: ${currentToken.length} characters`);
  }

  // Step 3: Test browser launch
  console.log('\n🌐 Step 3: Testing browser launch and token capture...\n');
  console.log('⏳ This may take 30-60 seconds...');
  console.log('   - Browser will launch (headless or visible)');
  console.log('   - Navigate to Whisk');
  console.log('   - Attempt to trigger image generation');
  console.log('   - Capture token from network request\n');

  const refresher = new WhiskTokenRefresher();

  try {
    const result = await refresher.refreshToken();

    console.log('\n' + '='.repeat(80));
    console.log('✅ SUCCESS! Token refresh completed\n');
    console.log(`New token: ${result.token.substring(0, 20)}...${result.token.substring(result.token.length - 10)}`);
    console.log(`Timestamp: ${new Date(result.timestamp).toISOString()}`);
    console.log(`Length: ${result.token.length} characters`);

    // Compare with old token
    if (currentToken && currentToken !== result.token) {
      console.log('\n🔄 Token has changed (refresh successful)');
    } else if (currentToken && currentToken === result.token) {
      console.log('\n⚠️  Token is the same as before (may still be valid)');
    }

    console.log('\n✅ Auto-refresh is working correctly!');
    console.log('\nNext steps:');
    console.log('1. The new token has been captured');
    console.log('2. Update .env manually: WHISK_API_TOKEN=' + result.token);
    console.log('3. Restart workers: npm run workers');

  } catch (error) {
    console.error('\n' + '='.repeat(80));
    console.error('❌ FAILED! Token refresh encountered errors\n');

    if (error instanceof Error) {
      console.error('Error message:');
      console.error(error.message);
      console.error('\nStack trace:');
      console.error(error.stack);
    } else {
      console.error('Unknown error:', error);
    }

    console.error('\n🔧 Troubleshooting:\n');
    console.error('1. Make sure you are logged into Google in Chrome');
    console.error('   - Open Chrome manually');
    console.error('   - Visit https://labs.google.com/whisk');
    console.error('   - Verify you can access Whisk without logging in');
    console.error('');
    console.error('2. Check if Chrome profile is accessible');
    console.error('   - Close all Chrome windows');
    console.error('   - Run this test again');
    console.error('');
    console.error('3. Try visible mode (not headless)');
    console.error('   - Edit .env: WHISK_TOKEN_REFRESH_HEADLESS=false');
    console.error("   - Run test again to see what's happening");
    console.error('');
    console.error('4. Check Whisk page structure');
    console.error('   - Google may have changed the UI');
    console.error('   - Selectors may need updating');

    process.exit(1);
  }
}

// Run test
testTokenRefresh().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});

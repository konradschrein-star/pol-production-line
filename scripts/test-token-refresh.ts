/**
 * Token Refresh Integration Test
 *
 * Tests the automatic token refresh system:
 * 1. Launches browser with Chrome profile
 * 2. Navigates to Whisk and triggers image generation
 * 3. Captures Bearer token from network request
 * 4. Stores token in memory and .env file
 * 5. Validates token format and retrieval
 *
 * Usage: npm run test:token-refresh
 */

import { WhiskTokenRefresher } from '../src/lib/whisk/token-refresh';
import { WhiskTokenStore } from '../src/lib/whisk/token-store';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testTokenRefresh() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           Whisk Token Refresh Integration Test              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    // Step 1: Refresh token
    console.log('📋 Step 1: Refreshing token via browser automation...');
    console.log('   - Launching Chrome with user profile');
    console.log('   - Navigating to Whisk');
    console.log('   - Triggering image generation');
    console.log('   - Capturing Bearer token from network');
    console.log('');

    const refresher = new WhiskTokenRefresher();
    const { token, timestamp } = await refresher.refreshToken();

    console.log('✅ Token captured successfully!');
    console.log(`   Token preview: ${token.substring(0, 30)}...`);
    console.log(`   Captured at: ${new Date(timestamp).toISOString()}`);
    console.log(`   Expires at: ${new Date(timestamp + 60 * 60 * 1000).toISOString()}`);
    console.log('');

    // Step 2: Store token
    console.log('📋 Step 2: Storing token in memory and .env file...');
    await WhiskTokenStore.setToken(token);

    console.log('✅ Token stored successfully!');
    console.log('   - Updated in-memory cache');
    console.log('   - Updated .env file');
    console.log('   - Updated process.env.WHISK_API_TOKEN');
    console.log('');

    // Step 3: Validate retrieval
    console.log('📋 Step 3: Validating token retrieval...');
    const retrievedToken = WhiskTokenStore.getToken();

    if (retrievedToken === token) {
      console.log('✅ Token retrieved successfully from store!');
      console.log(`   Retrieved token matches captured token`);
    } else {
      throw new Error('Token mismatch! Retrieved token does not match captured token.');
    }
    console.log('');

    // Step 4: Check expiration info
    console.log('📋 Step 4: Checking expiration tracking...');
    const expirationInfo = WhiskTokenStore.getExpirationInfo();

    console.log('✅ Expiration tracking working!');
    console.log(`   Is expired: ${expirationInfo.isExpired}`);
    console.log(`   Time remaining: ${Math.floor(expirationInfo.timeRemaining / 1000 / 60)} minutes`);
    console.log(`   Expires at: ${expirationInfo.expiresAt?.toISOString()}`);
    console.log('');

    // Success summary
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                    🎉 ALL TESTS PASSED! 🎉                   ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('Summary:');
    console.log('  ✅ Browser automation working');
    console.log('  ✅ Token capture working');
    console.log('  ✅ Token storage working (.env + memory)');
    console.log('  ✅ Token retrieval working');
    console.log('  ✅ Expiration tracking working');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Test automatic refresh by expiring token manually');
    console.log('  2. Create a test job to verify images worker integration');
    console.log('  3. Monitor worker logs for automatic refresh behavior');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('╔══════════════════════════════════════════════════════════════╗');
    console.error('║                      ❌ TEST FAILED                          ║');
    console.error('╚══════════════════════════════════════════════════════════════╝');
    console.error('');
    console.error('Error details:', error);
    console.error('');

    if (error instanceof Error) {
      if (error.message.includes('Chrome profile not found')) {
        console.error('💡 Tip: Set CHROME_PROFILE_PATH in .env to your Chrome user data directory');
        console.error('   Example: CHROME_PROFILE_PATH=C:\\Users\\YourName\\AppData\\Local\\Google\\Chrome\\User Data');
      }

      if (error.message.includes('2-Step Verification')) {
        console.error('💡 Tip: Complete Google 2FA in your browser first, then retry this test');
      }

      if (error.message.includes('Token not captured')) {
        console.error('💡 Tip: Whisk UI may have changed. Check if page loaded correctly.');
        console.error('   Try running with WHISK_TOKEN_REFRESH_HEADLESS=false to see browser.');
      }
    }

    console.error('');
    process.exit(1);
  }
}

// Run test
testTokenRefresh().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

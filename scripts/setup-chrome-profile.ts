/**
 * One-Time Chrome Automation Profile Setup
 *
 * This script opens the automation Chrome profile so you can:
 * 1. Install the Auto Whisk extension (if not already installed)
 * 2. Log into your Google account
 *
 * After this ONE-TIME setup, all future automation runs will use this profile.
 * You will NEVER need to log in again.
 */

import { spawn } from 'child_process';
import { join } from 'path';
import { existsSync } from 'fs';
import { config } from 'dotenv';

// ✅ FIX: Load environment variables
config();

async function setupChromeProfile() {
  // ✅ FIX: Read extension ID from environment (no hardcoded fallback)
  const extensionId = process.env.AUTO_WHISK_EXTENSION_ID;
  if (!extensionId) {
    console.error('❌ AUTO_WHISK_EXTENSION_ID not configured in .env file');
    console.error('   Add AUTO_WHISK_EXTENSION_ID=gcgblhgncmhjchllkcpcneeibddhmbbe to your .env file.');
    process.exit(1);
  }
  console.log('\n🔧 ========================================');
  console.log('🔧 ONE-TIME CHROME SETUP');
  console.log('🔧 ========================================\n');

  console.log('ℹ️  WHY THIS IS NEEDED:');
  console.log('   Chrome security prevents automation from using your main profile.');
  console.log('   This setup creates a separate automation profile with your Google login.\n');

  // Find Chrome executable
  const chromePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
  ];

  const chromePath = chromePaths.find(p => existsSync(p));

  if (!chromePath) {
    console.error('❌ Chrome executable not found. Please install Google Chrome.');
    process.exit(1);
  }

  console.log(`✅ Chrome found: ${chromePath}\n`);

  // Automation profile path
  const automationProfilePath = join(process.env.LOCALAPPDATA || '', 'ObsidianNewsDesk', 'chrome-automation');
  console.log(`📁 Automation profile: ${automationProfilePath}\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 WHAT YOU NEED TO DO:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('1️⃣  INSTALL AUTO WHISK EXTENSION');
  console.log('   → Chrome will open to the extension page');
  console.log('   → Click "Add to Chrome"');
  console.log('   → Confirm installation\n');

  console.log('2️⃣  LOG INTO GOOGLE');
  console.log('   → Click the Chrome profile icon (top-right)');
  console.log('   → Click "Sign in"');
  console.log('   → Log in with your Google account\n');

  console.log('3️⃣  TEST AUTO WHISK (Optional)');
  console.log('   → Click the Auto Whisk extension icon');
  console.log('   → Try generating a test image');
  console.log('   → Verify it works\n');

  console.log('4️⃣  CLOSE CHROME');
  console.log('   → When done, just close the Chrome window');
  console.log('   → Your login is saved automatically!\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('⏳ Opening Chrome in 5 seconds...\n');

  await new Promise(resolve => setTimeout(resolve, 5000));

  // Launch Chrome with automation profile
  const chromeArgs = [
    `--user-data-dir=${automationProfilePath}`,
    '--new-window',
    `https://chromewebstore.google.com/detail/auto-whisk-nano-banana-im/${extensionId}`
  ];

  console.log('🚀 Launching Chrome...\n');

  const chromeProcess = spawn(chromePath, chromeArgs, {
    detached: false,
    stdio: 'ignore',
    shell: false
  });

  console.log('✅ Chrome launched with automation profile!');
  console.log('👀 Follow the instructions above...\n');
  console.log('⏸️  This script will wait until you close Chrome.\n');

  // Wait for Chrome to exit
  chromeProcess.on('exit', () => {
    console.log('\n✅ ========================================');
    console.log('✅ SETUP COMPLETE!');
    console.log('✅ ========================================\n');
    console.log('🎉 Your Google login and Auto Whisk extension are saved!');
    console.log('🔄 All future automation runs will use this profile automatically.\n');
    console.log('📝 Next step: Run the test to verify everything works:');
    console.log('   npm run test:autowhisk\n');
  });

  chromeProcess.on('error', (error) => {
    console.error('\n❌ Failed to launch Chrome:', error.message);
    process.exit(1);
  });
}

setupChromeProfile().catch((error) => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
});

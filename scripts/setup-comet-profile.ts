/**
 * One-time Comet browser setup for Auto Whisk automation
 *
 * This script opens Comet browser with a dedicated automation profile
 * where you can install Auto Whisk extension and log into Google.
 *
 * Run once: npm run setup:comet
 */

import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const AUTO_WHISK_URL = 'https://chromewebstore.google.com/detail/auto-whisk-nano-banana-im/gedfnhdibkfgacmkbjgpfjihacalnlpn';
const EXTENSION_ID = 'gedfnhdibkfgacmkbjgpfjihacalnlpn';

async function setupCometProfile() {
  console.log('\n🔧 COMET AUTOMATION PROFILE SETUP\n');
  console.log('This one-time setup will:');
  console.log('1. Create a dedicated Comet automation profile');
  console.log('2. Open the Auto Whisk extension installation page');
  console.log('3. Wait for you to install the extension and log into Google\n');

  const cometExecutable = 'C:\\Users\\konra\\AppData\\Local\\Perplexity\\Comet\\Application\\comet.exe';
  const automationProfilePath = 'C:\\Users\\konra\\AppData\\Local\\ObsidianNewsDesk\\comet-automation';

  // Verify Comet executable exists
  if (!existsSync(cometExecutable)) {
    console.error(`❌ Comet executable not found at: ${cometExecutable}`);
    console.error('   Please install Comet browser first.');
    process.exit(1);
  }

  // Create automation profile directory if it doesn't exist
  if (!existsSync(automationProfilePath)) {
    console.log(`📁 Creating automation profile directory...`);
    mkdirSync(automationProfilePath, { recursive: true });
    console.log(`✅ Created: ${automationProfilePath}\n`);
  }

  console.log('🚀 Launching Comet browser...\n');

  try {
    // Launch Comet with persistent context (automation profile)
    const context = await chromium.launchPersistentContext(automationProfilePath, {
      executablePath: cometExecutable,
      headless: false, // MUST be visible for user interaction
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
      ],
      ignoreDefaultArgs: ['--disable-extensions', '--disable-component-extensions-with-background-pages'],
      acceptDownloads: true,
      viewport: { width: 1920, height: 1080 },
    });

    const page = await context.newPage();

    console.log('📋 INSTRUCTIONS:\n');
    console.log('1. Install the Auto Whisk extension from the Chrome Web Store');
    console.log('2. Click "Add to Comet" to install the extension');
    console.log('3. Navigate to: chrome-extension://' + EXTENSION_ID + '/gateway.html');
    console.log('4. Log into your Google account when prompted');
    console.log('5. Authorize Whisk to access your Google account');
    console.log('6. Once logged in, close the browser window\n');
    console.log('⏳ Opening Chrome Web Store...\n');

    // Navigate to Auto Whisk installation page
    await page.goto(AUTO_WHISK_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    console.log('✅ Extension page loaded');
    console.log('\n🔐 Waiting for you to complete the setup...');
    console.log('   (This script will wait indefinitely - close the browser when done)\n');

    // Wait for user to close the browser
    await context.waitForEvent('close');

    console.log('\n✅ SETUP COMPLETE!\n');
    console.log('Your Google login is now saved in the automation profile.');
    console.log('You can now run: npm run test:autowhisk\n');

  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  }
}

setupCometProfile().catch(console.error);

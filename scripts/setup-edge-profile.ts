/**
 * One-time Edge browser setup for Auto Whisk automation
 *
 * This script opens Edge browser with a dedicated automation profile
 * where you can install Auto Whisk extension and log into Google.
 *
 * Run once: npm run setup:edge
 */

import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
import * as os from 'os';

// ✅ FIX: Load environment variables
config();

// ✅ FIX: Read extension ID from environment (no hardcoded fallback)
const EXTENSION_ID = process.env.AUTO_WHISK_EXTENSION_ID;
if (!EXTENSION_ID) {
  console.error('❌ AUTO_WHISK_EXTENSION_ID not configured in .env file');
  console.error('   Add AUTO_WHISK_EXTENSION_ID=gcgblhgncmhjchllkcpcneeibddhmbbe to your .env file.');
  process.exit(1);
}

const AUTO_WHISK_URL = `https://chromewebstore.google.com/detail/auto-whisk-nano-banana-im/${EXTENSION_ID}`;

async function setupEdgeProfile() {
  console.log('\n🔧 EDGE AUTOMATION PROFILE SETUP\n');
  console.log('This one-time setup will:');
  console.log('1. Create a dedicated Edge automation profile');
  console.log('2. Open the Auto Whisk extension installation page');
  console.log('3. Wait for you to install the extension and log into Google\n');

  // ✅ FIX: Auto-detect Edge executable path (try multiple locations)
  const possibleEdgePaths = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];

  const edgeExecutable = possibleEdgePaths.find(p => existsSync(p));
  if (!edgeExecutable) {
    console.error(`❌ Edge executable not found at:`);
    possibleEdgePaths.forEach(p => console.error(`   ${p}`));
    console.error('   Please install Microsoft Edge first.');
    process.exit(1);
  }

  // ✅ FIX: Use environment-aware paths (not hardcoded to specific user)
  const localAppData = process.env.LOCALAPPDATA || join(os.homedir(), 'AppData', 'Local');
  const automationProfilePath = join(localAppData, 'ObsidianNewsDesk', 'edge-automation');

  // Create automation profile directory if it doesn't exist
  if (!existsSync(automationProfilePath)) {
    console.log(`📁 Creating automation profile directory...`);
    mkdirSync(automationProfilePath, { recursive: true });
    console.log(`✅ Created: ${automationProfilePath}\n`);
  }

  console.log('🚀 Launching Edge browser...\n');

  try {
    // Launch Edge with persistent context (automation profile)
    const context = await chromium.launchPersistentContext(automationProfilePath, {
      executablePath: edgeExecutable,
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
    console.log('2. Click "Add to Edge" to install the extension');
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

    // Wait for user to close the browser (no timeout)
    await context.waitForEvent('close', { timeout: 0 });

    console.log('\n✅ SETUP COMPLETE!\n');
    console.log('Your Google login is now saved in the automation profile.');
    console.log('You can now run: npm run test:autowhisk\n');

  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  }
}

setupEdgeProfile().catch(console.error);

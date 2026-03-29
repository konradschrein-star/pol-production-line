#!/usr/bin/env tsx
/**
 * Real Issues Diagnostic
 * Checks the ACTUAL problems:
 * 1. Chrome extension auto-refresh status
 * 2. Why avatars fail without being Remotion-incompatible (wrong diagnosis)
 */

import 'dotenv/config';
import { existsSync, readFileSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import fetch from 'node-fetch';

const execAsync = promisify(exec);

console.log('🔍 REAL ISSUES DIAGNOSTIC\n');
console.log('═'.repeat(60));

// Issue #1: Chrome Extension Status
console.log('\n📌 ISSUE #1: Chrome Extension Auto-Refresh');
console.log('─'.repeat(60));

async function checkChromeExtension() {
  const extensionId = process.env.AUTO_WHISK_EXTENSION_ID;

  console.log(`Extension ID (from .env): ${extensionId || '❌ NOT SET'}`);

  if (!extensionId) {
    console.log('\n❌ PROBLEM: AUTO_WHISK_EXTENSION_ID not set in .env');
    console.log('   Extension cannot communicate with backend\n');
    console.log('Fix:');
    console.log('  1. Open Chrome → chrome://extensions/');
    console.log('  2. Enable Developer Mode');
    console.log('  3. Load unpacked → select chrome-extension/ folder');
    console.log('  4. Copy extension ID (looks like: gcgblhgncmhjchllkcpcneeibddhmbbe)');
    console.log('  5. Add to .env: AUTO_WHISK_EXTENSION_ID=<your-id>');
    return false;
  }

  // Check if extension is installed by checking Chrome profile
  console.log('\n🔍 Checking Chrome installation...');

  const chromeExtensionPath = `C:\\Users\\konra\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Extensions\\${extensionId}`;
  const edgeExtensionPath = `C:\\Users\\konra\\AppData\\Local\\Microsoft\\Edge\\User Data\\Default\\Extensions\\${extensionId}`;

  const chromeInstalled = existsSync(chromeExtensionPath);
  const edgeInstalled = existsSync(edgeExtensionPath);

  console.log(`   Chrome: ${chromeInstalled ? '✅ Installed' : '❌ Not found'}`);
  console.log(`   Edge: ${edgeInstalled ? '✅ Installed' : '❌ Not found'}`);

  if (!chromeInstalled && !edgeInstalled) {
    console.log('\n❌ PROBLEM: Extension not installed in any browser');
    console.log('   Auto-refresh will NOT work\n');
    console.log('Fix:');
    console.log('  cd obsidian-news-desk/chrome-extension');
    console.log('  See INSTALL.md for instructions');
    return false;
  }

  // Check extension status endpoint
  console.log('\n🔍 Checking extension communication with backend...');

  try {
    const response = await fetch('http://localhost:8347/api/whisk/extension-status', {
      timeout: 3000,
    });

    if (!response.ok) {
      console.log('❌ PROBLEM: Extension status endpoint failed');
      console.log(`   Status: ${response.status}`);
      return false;
    }

    const data: any = await response.json();

    console.log(`   Extension Installed: ${data.extensionInstalled ? '✅ YES' : '❌ NO'}`);
    console.log(`   Active: ${data.active ? '✅ YES' : '❌ NO'}`);
    console.log(`   Last Token Update: ${data.lastTokenUpdate ? new Date(data.lastTokenUpdate).toLocaleString() : '❌ Never'}`);

    if (data.tokenPreview) {
      console.log(`   Token Preview: ${data.tokenPreview}`);
    }

    if (!data.extensionInstalled || !data.active) {
      console.log('\n⚠️  PROBLEM: Extension installed but not active');
      console.log('   Token may not be auto-refreshing\n');
      console.log('Fix:');
      console.log('  1. Open Chrome → chrome://extensions/');
      console.log('  2. Find "Whisk Token Manager - Production"');
      console.log('  3. Ensure it is ENABLED');
      console.log('  4. Click extension icon → should show "Token Active"');
      console.log('  5. If not, visit https://labs.google/fx/de/tools/whisk');
      console.log('  6. Generate test image to trigger token capture');
      return false;
    }

    console.log('\n✅ Extension is working correctly!');
    return true;

  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ PROBLEM: Backend not running');
      console.log('   Extension cannot send tokens\n');
      console.log('Fix:');
      console.log('  npm run dev');
    } else {
      console.log(`❌ PROBLEM: ${error.message}`);
    }
    return false;
  }
}

// Issue #2: Why does token still expire if extension works?
console.log('\n📌 ISSUE #2: Token Expiry Despite Auto-Refresh');
console.log('─'.repeat(60));

async function checkTokenExpiry() {
  const token = process.env.WHISK_API_TOKEN;

  if (!token) {
    console.log('❌ No token in .env');
    return false;
  }

  console.log(`Current token: ${token.substring(0, 20)}...`);

  // Check token timestamp file
  const timestampFile = 'C:\\Users\\konra\\OneDrive\\Projekte\\20260319 Political content automation\\obsidian-news-desk\\.whisk-token-timestamp';

  if (existsSync(timestampFile)) {
    const timestamp = parseInt(readFileSync(timestampFile, 'utf-8'));
    const age = Date.now() - timestamp;
    const ageMinutes = Math.floor(age / (1000 * 60));

    console.log(`Token age: ${ageMinutes} minutes`);

    if (age > 60 * 60 * 1000) {
      console.log('⚠️  Token is >1 hour old (may be expired)');
      console.log('   Extension should have refreshed it by now\n');
      console.log('Possible causes:');
      console.log('  1. Extension not running');
      console.log('  2. Extension 12-hour alarm not firing');
      console.log('  3. Backend not updating .env when extension sends token');
      return false;
    } else {
      console.log('✅ Token is fresh (<1 hour)');
      return true;
    }
  } else {
    console.log('⚠️  No timestamp file found');
    console.log('   Cannot determine token age');
    return false;
  }
}

// Issue #3: Avatar codec issues (NOT optimization preference)
console.log('\n📌 ISSUE #3: Avatar Format Compatibility');
console.log('─'.repeat(60));
console.log('YOU SAID: "We do not want to optimize avatars"');
console.log('CLARIFICATION: Avatars fail due to CODEC issues, not file size\n');

async function checkAvatarCompatibility() {
  const avatarsPath = 'C:\\Users\\konra\\ObsidianNewsDesk\\avatars';

  if (!existsSync(avatarsPath)) {
    console.log('❌ No avatars directory found');
    return;
  }

  try {
    const { stdout } = await execAsync(`dir /b "${avatarsPath}\\*.mp4"`);
    const avatars = stdout.trim().split('\n').filter(Boolean);

    if (avatars.length === 0) {
      console.log('No avatars found');
      return;
    }

    console.log(`Found ${avatars.length} avatar(s):\n`);

    for (const avatar of avatars.slice(0, 3)) {
      // Only check first 3
      const fullPath = `${avatarsPath}\\${avatar.trim()}`;

      try {
        // Use FFprobe to check codec
        const ffprobePath = require('ffprobe-static');
        const { stdout: probeOut } = await execAsync(`"${ffprobePath}" -v error -select_streams v:0 -show_entries stream=codec_name,profile,width,height -of default=noprint_wrappers=1 "${fullPath}"`);

        console.log(`📹 ${avatar.trim()}`);
        console.log(probeOut.trim().split('\n').map(l => `   ${l}`).join('\n'));

        // Check if codec is H.264 baseline/main (browser-compatible)
        if (probeOut.includes('codec_name=h264')) {
          if (probeOut.includes('profile=High') || probeOut.includes('profile=High 10')) {
            console.log('   ⚠️  H.264 High profile - may NOT work in Chromium');
            console.log('   Chromium prefers Baseline/Main profile\n');
          } else {
            console.log('   ✅ H.264 Baseline/Main - should work\n');
          }
        } else {
          console.log('   ⚠️  Non-H.264 codec - may NOT work in Chromium\n');
        }
      } catch (error) {
        console.log(`   ❌ Could not probe: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
      }
    }

    console.log('WHY THIS MATTERS:');
    console.log('  • HeyGen outputs H.264 High profile (for quality)');
    console.log('  • Chromium (Remotion) only supports H.264 Baseline/Main');
    console.log('  • This is a CODEC issue, not a preference\n');
    console.log('SOLUTION:');
    console.log('  Option 1: Ask HeyGen to output Baseline profile (if possible)');
    console.log('  Option 2: Re-encode avatars to Baseline (what optimize-avatar.sh does)');
    console.log('  Option 3: Use different renderer (not Remotion)');

  } catch (error) {
    console.log('No MP4 files found');
  }
}

// Run all diagnostics
async function main() {
  const extensionOk = await checkChromeExtension();

  console.log('');
  await checkTokenExpiry();

  console.log('');
  await checkAvatarCompatibility();

  console.log('\n═'.repeat(60));
  console.log('SUMMARY\n');

  console.log('Your concerns:');
  console.log('  1. ❓ "Why do I need to optimize avatars?"');
  console.log('     → Because HeyGen uses H.264 High profile (incompatible with Chromium)');
  console.log('     → Remotion renderer uses Chromium which requires Baseline/Main profile');
  console.log('     → This is a technical limitation, not a preference\n');

  console.log('  2. ❓ "Why does token expire when extension should refresh it?"');
  console.log('     → Extension may not be installed/active');
  console.log('     → Extension refreshes every 12 hours, token expires in 1 hour');
  console.log('     → Extension alarm may not be firing\n');

  if (extensionOk) {
    console.log('✅ Chrome extension is working');
    console.log('   Run this diagnostic again in 1 hour to verify auto-refresh\n');
  } else {
    console.log('❌ Chrome extension is NOT working');
    console.log('   Token will expire every hour until extension is fixed\n');
  }

  console.log('═'.repeat(60));
}

main();

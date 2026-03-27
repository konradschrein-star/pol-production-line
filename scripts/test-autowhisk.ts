/**
 * Auto Whisk Test Script
 *
 * This script tests the Auto Whisk browser automation by generating a single test image.
 *
 * Usage:
 *   npm run test:autowhisk
 *
 * Prerequisites:
 *   - Auto Whisk extension installed in Chrome/Edge
 *   - AUTO_WHISK_EXTENSION_ID set in .env
 *   - Logged into Google account in the browser profile
 */

// Load environment variables
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env') });

import { BrowserManager } from '../src/lib/browser';
import { navigateToAutoWhisk, generateImages, waitForGenerationComplete, getAutoWhiskDownloadFolder } from '../src/lib/browser/auto-whisk';
import { FolderMonitor, waitForFiles } from '../src/lib/browser/folder-monitor';

async function testAutoWhisk() {
  console.log('\n🧪 ========================================');
  console.log('🧪 AUTO WHISK TEST');
  console.log('🧪 ========================================\n');

  let browserManager: BrowserManager | null = null;
  let folderMonitor: FolderMonitor | null = null;

  try {
    // 1. Setup folder monitor
    const downloadFolder = getAutoWhiskDownloadFolder();
    console.log(`📂 Download folder: ${downloadFolder}`);

    folderMonitor = new FolderMonitor(downloadFolder);
    folderMonitor.start();

    console.log('👀 Folder monitor started\n');

    // 2. Launch browser
    console.log('🚀 Launching browser...');
    browserManager = new BrowserManager({
      headless: false, // Must be false for Chrome extensions
      extensionId: process.env.AUTO_WHISK_EXTENSION_ID,
    });

    const context = await browserManager.launch();
    const page = await browserManager.newPage();

    console.log('✅ Browser launched\n');

    // 3. Navigate to Auto Whisk generation page
    console.log('🔗 Navigating to Auto Whisk...');
    await navigateToAutoWhisk(page);

    console.log('✅ Auto Whisk loaded\n');

    // 4. Generate test image (downloads will be handled by Playwright API)
    const testPrompt = 'A beautiful sunset over mountains, digital art style, vibrant colors';

    console.log('🎨 Generating test image...');
    console.log(`   Prompt: "${testPrompt}"`);
    console.log('   Aspect ratio: 16:9');
    console.log('   Image count: 1\n');

    const downloadedFiles = await generateImages(page, [testPrompt], 1, '16:9', downloadFolder);

    console.log(`✅ Generation complete: ${downloadedFiles.length} image(s) downloaded\n`);

    // 5. Verify downloads
    if (downloadedFiles.length === 0) {
      throw new Error('No images were downloaded');
    }

    const downloadedFilePath = downloadedFiles[0];
    console.log(`📸 Image saved: ${downloadedFilePath}\n`);

    // 6. Wait for generation status to return to Ready
    console.log('⏳ Waiting for Auto Whisk to finish...');
    await waitForGenerationComplete(page, 180000);

    console.log('✅ Auto Whisk ready\n');

    // 8. Success
    console.log('\n🎉 ========================================');
    console.log('🎉 TEST PASSED!');
    console.log('🎉 ========================================\n');

    console.log(`📸 Generated image saved to: ${downloadedFilePath}`);
    console.log('\nYou can now close the browser window.\n');

    // Keep browser open for 10 seconds so user can see the result
    console.log('ℹ️  Browser will remain open for 10 seconds...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('\n❌ ========================================');
    console.error('❌ TEST FAILED!');
    console.error('❌ ========================================\n');

    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error:', errorMessage);

    // Check if this is a Google login required
    if (errorMessage.includes('Login required') || errorMessage.includes('Connection timeout') || errorMessage.includes('Google OAuth')) {
      console.log('\n🔐 ========================================');
      console.log('🔐 GOOGLE LOGIN REQUIRED');
      console.log('🔐 ========================================\n');
      console.log('The browser will stay open for you to log in.\n');
      console.log('📋 INSTRUCTIONS:');
      console.log('1. A Google OAuth tab should be open in the browser');
      console.log('2. LOG IN to your Google account in that tab');
      console.log('3. Complete the Whisk authorization');
      console.log('4. Once logged in, close the browser manually');
      console.log('5. Your session will be saved for future runs\n');
      console.log('⏳ Browser will stay open indefinitely...');
      console.log('   Close the browser when done, or press Ctrl+C to exit\n');

      // Keep browser open indefinitely for manual login
      await new Promise(() => {}); // Never resolves - keeps browser open
    }

    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }

    process.exit(1);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');

    if (folderMonitor?.isWatching()) {
      await folderMonitor.stop();
      console.log('✅ Folder monitor stopped');
    }

    if (browserManager?.isRunning()) {
      await browserManager.close();
      console.log('✅ Browser closed');
    }

    console.log('\n✅ Test complete\n');
  }
}

// Run the test
testAutoWhisk().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

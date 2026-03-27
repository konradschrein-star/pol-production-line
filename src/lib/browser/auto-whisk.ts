import { Page } from 'playwright';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { detectBan } from './ban-detection';

/**
 * Navigate to Auto Whisk extension page
 * Opens the extension as a normal tab using chrome-extension:// URL
 */
export async function navigateToAutoWhisk(page: Page): Promise<void> {
  try {
    const extensionId = process.env.AUTO_WHISK_EXTENSION_ID || 'gedfnhdibkfgacmkbjgpfjihacalnlpn';
    const extensionUrl = `chrome-extension://${extensionId}/gateway.html`;

    console.log(`🔗 [AutoWhisk] Opening extension as normal tab...`);

    // Navigate to a regular page first to establish context
    console.log(`   Loading Google first...`);
    await page.goto('https://www.google.com', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1000);

    // Now navigate to the extension URL
    console.log(`   Navigating to: ${extensionUrl}`);
    await page.goto(extensionUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    console.log('✅ [AutoWhisk] Extension page loaded');

    // Wait for page to fully initialize
    await page.waitForTimeout(3000);

  } catch (error) {
    console.error('❌ [AutoWhisk] Navigation failed:', error);
    throw new Error(`Failed to navigate to Auto Whisk: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Generate images using Auto Whisk extension
 *
 * @param page - Playwright page with Auto Whisk loaded
 * @param prompts - Array of image prompts (1 prompt = 1 line)
 * @param imageCount - Number of images per prompt (default: 1)
 * @param aspectRatio - Aspect ratio (default: "16:9")
 * @param downloadPath - Optional path to save downloaded images
 * @returns Promise that resolves with array of downloaded file paths
 */
export async function generateImages(
  page: Page,
  prompts: string[],
  imageCount: number = 1,
  aspectRatio: string = '16:9',
  downloadPath?: string
): Promise<string[]> {
  try {
    console.log(`🎨 [AutoWhisk] Generating ${prompts.length} images...`);
    console.log(`   Image count per prompt: ${imageCount}`);
    console.log(`   Aspect ratio: ${aspectRatio}`);

    // Check for ban BEFORE attempting generation
    const initialBanCheck = await detectBan(page);
    if (initialBanCheck.isBanned) {
      throw new Error(`Cannot generate images: ${initialBanCheck.reason} (${initialBanCheck.type})`);
    }

    // Wait for UI to be ready
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Give extension time to initialize

    // Set language to English for consistency
    console.log('🌐 [AutoWhisk] Setting language to English...');
    const languageSelector = page.locator('#languageSelector');
    if (await languageSelector.count() > 0) {
      await languageSelector.selectOption('en');
      await page.waitForTimeout(500); // Wait for language change to apply
      console.log('✅ [AutoWhisk] Language set to English');
    }

    // Find and fill the prompt textarea by ID
    console.log('📝 [AutoWhisk] Filling prompts...');

    const promptTextarea = page.locator('#prompts');

    if (await promptTextarea.count() === 0) {
      throw new Error('Could not find prompt textarea with id="prompts"');
    }

    // Fill prompts (one per line)
    const promptText = prompts.join('\n');
    await promptTextarea.fill(promptText);

    console.log(`✅ [AutoWhisk] Filled ${prompts.length} prompts`);

    // Set aspect ratio dropdown by ID
    console.log('📐 [AutoWhisk] Setting aspect ratio...');

    const aspectRatioSelector = page.locator('#aspectRatioSelector');

    if (await aspectRatioSelector.count() === 0) {
      throw new Error('Could not find aspect ratio selector with id="aspectRatioSelector"');
    }

    // Map user-friendly aspect ratio to internal value
    const aspectRatioMap: { [key: string]: string } = {
      '1:1': 'IMAGE_ASPECT_RATIO_SQUARE',
      '16:9': 'IMAGE_ASPECT_RATIO_LANDSCAPE',
      '9:16': 'IMAGE_ASPECT_RATIO_PORTRAIT',
      '4:3': 'IMAGE_ASPECT_RATIO_LANDSCAPE_FOUR_THREE',
      '3:4': 'IMAGE_ASPECT_RATIO_PORTRAIT_THREE_FOUR',
    };

    const aspectRatioValue = aspectRatioMap[aspectRatio] || 'IMAGE_ASPECT_RATIO_LANDSCAPE';
    await aspectRatioSelector.selectOption(aspectRatioValue);

    console.log(`✅ [AutoWhisk] Aspect ratio set to ${aspectRatio} (${aspectRatioValue})`);

    // Set image count dropdown by ID
    console.log('🔢 [AutoWhisk] Setting image count...');

    const imageCountSelector = page.locator('#imageCountSelector');

    if (await imageCountSelector.count() === 0) {
      throw new Error('Could not find image count selector with id="imageCountSelector"');
    }

    await imageCountSelector.selectOption(imageCount.toString());

    console.log(`✅ [AutoWhisk] Image count set to ${imageCount}`);

    // Click Start button by ID
    console.log('▶️ [AutoWhisk] Clicking Start button...');

    const startButton = page.locator('#mainActionButton');

    if (await startButton.count() === 0) {
      throw new Error('Could not find Start button with id="mainActionButton"');
    }

    await startButton.click();

    console.log('✅ [AutoWhisk] Start button clicked');

    // Wait for connection to Google
    console.log('⏳ [AutoWhisk] Waiting for Google connection...');

    const liveStatus = page.locator('#liveStatus');
    let waitTime = 0;
    const maxWaitTime = 120000; // 2 minutes for OAuth
    const checkInterval = 2000; // Check every 2 seconds

    let loginDetected = false;

    while (waitTime < maxWaitTime) {
      await page.waitForTimeout(checkInterval);
      waitTime += checkInterval;

      if (await liveStatus.count() > 0) {
        const statusText = await liveStatus.textContent();
        console.log(`📊 [AutoWhisk] Status: "${statusText}" (${waitTime / 1000}s)`);

        // Check if login required - WAIT INDEFINITELY
        if (statusText && statusText.toLowerCase().includes('login')) {
          if (!loginDetected) {
            loginDetected = true;
            console.log('\n🔐 ========================================');
            console.log('🔐 GOOGLE LOGIN REQUIRED');
            console.log('🔐 ========================================\n');
            console.log('The Google OAuth tab should be open now.');
            console.log('\n📋 PLEASE:');
            console.log('1. Switch to the OAuth tab');
            console.log('2. Log in to your Google account');
            console.log('3. Authorize Whisk');
            console.log('4. Return here - generation will start automatically\n');
            console.log('⏳ Waiting for you to complete login...\n');
          }
          // Reset timeout to keep waiting
          waitTime = 0;
          maxWaitTime = 600000; // Extend to 10 minutes
          continue;
        }

        // Check if generation started (status changed from "Connecting..." and not "Waiting")
        if (statusText && !statusText.includes('Connecting') && !statusText.toLowerCase().includes('waiting')) {
          if (loginDetected) {
            console.log('✅ [AutoWhisk] Login completed successfully!');
          }
          console.log('✅ [AutoWhisk] Connected to Google');
          break;
        }
      }
    }

    // Final status check
    if (await liveStatus.count() > 0) {
      const finalStatus = await liveStatus.textContent();

      if (finalStatus && finalStatus.includes('Connecting')) {
        console.error('❌ [AutoWhisk] Still connecting after 2 minutes');
        console.error('   This likely means Google OAuth is required');
        console.error('   Please check the browser window for login prompts');
        throw new Error('Connection timeout - Google OAuth may be required');
      }

      console.log(`✅ [AutoWhisk] Final status: "${finalStatus}"`);
    }

    // Take screenshot for debugging
    try {
      await page.screenshot({ path: './debug-connected.png' });
      console.log('📸 [AutoWhisk] Screenshot saved to debug-connected.png');
    } catch (e) {
      // Ignore screenshot errors
    }

    // Set up download handling with Playwright's download API
    const expectedDownloads = prompts.length * imageCount;
    const downloadedFiles: string[] = [];
    const downloadFolder = downloadPath || getAutoWhiskDownloadFolder();

    // Ensure download folder exists
    if (!existsSync(downloadFolder)) {
      mkdirSync(downloadFolder, { recursive: true });
      console.log(`📁 [AutoWhisk] Created download folder: ${downloadFolder}`);
    }

    console.log(`📥 [AutoWhisk] Setting up download capture for ${expectedDownloads} images...`);
    console.log(`   Download folder: ${downloadFolder}`);

    // Listen for downloads
    const downloadPromises: Promise<string>[] = [];

    for (let i = 0; i < expectedDownloads; i++) {
      const downloadPromise = page.waitForEvent('download', { timeout: 600000 }).then(async (download) => {
        const suggestedFilename = download.suggestedFilename();
        const filename = suggestedFilename || `image_${Date.now()}_${i}.png`;
        const filepath = join(downloadFolder, filename);

        console.log(`📥 [AutoWhisk] Download ${i + 1}/${expectedDownloads} started: ${filename}`);

        // Save the download
        await download.saveAs(filepath);

        console.log(`✅ [AutoWhisk] Download ${i + 1}/${expectedDownloads} saved: ${filepath}`);

        return filepath;
      });

      downloadPromises.push(downloadPromise);
    }

    // Wait for all downloads to complete
    console.log(`⏳ [AutoWhisk] Waiting for ${expectedDownloads} downloads to complete...`);
    const files = await Promise.all(downloadPromises);
    downloadedFiles.push(...files);

    console.log(`✅ [AutoWhisk] All downloads complete: ${downloadedFiles.length} files`);

    return downloadedFiles;

  } catch (error) {
    console.error('❌ [AutoWhisk] Generation failed:', error);
    throw new Error(`Auto Whisk generation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Wait for Auto Whisk generation to complete
 * Monitors the status indicator until it shows "Ready" again
 *
 * @param page - Playwright page
 * @param timeout - Maximum wait time in milliseconds (default: 180000 = 3 minutes)
 */
export async function waitForGenerationComplete(
  page: Page,
  timeout: number = 180000
): Promise<void> {
  try {
    console.log('⏳ [AutoWhisk] Waiting for generation to complete...');

    const startTime = Date.now();

    // Poll for "Ready" status with ban detection
    while (Date.now() - startTime < timeout) {
      // Check for ban indicators during generation
      const banCheck = await detectBan(page);
      if (banCheck.isBanned) {
        throw new Error(`Generation blocked: ${banCheck.reason} (${banCheck.type})`);
      }

      // Check status element by ID
      const liveStatus = page.locator('#liveStatus');

      if (await liveStatus.count() > 0) {
        const statusText = await liveStatus.textContent();

        // Check if status indicates ready (various language versions)
        // Vietnamese: "Sẵn sàng", English: "Ready", etc.
        if (statusText && (
          statusText.includes('Ready') ||
          statusText.includes('Sẵn sàng') ||
          statusText.toLowerCase().includes('ready')
        ) && !statusText.includes('Generating')) {
          console.log('✅ [AutoWhisk] Generation complete');
          return;
        }

        console.log(`   Status: ${statusText}`);
      }

      // Wait before next check
      await page.waitForTimeout(5000); // 5 seconds between checks
    }

    throw new Error('Generation timeout exceeded');

  } catch (error) {
    console.error('❌ [AutoWhisk] Wait for completion failed:', error);
    throw new Error(`Failed to wait for generation: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get the download folder path where Auto Whisk saves images
 * Default is <UserDownloads>/Whisk Downloads/
 */
export function getAutoWhiskDownloadFolder(): string {
  const homeDir = process.env.USERPROFILE || process.env.HOME || '';
  const downloadsPath = join(homeDir, 'Downloads', 'Whisk Downloads');

  return downloadsPath;
}

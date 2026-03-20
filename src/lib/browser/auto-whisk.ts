import { Page } from 'playwright';
import { join } from 'path';
import { detectBan } from './ban-detection';

/**
 * Navigate to Auto Whisk extension page
 * The extension runs at chrome-extension://{extension-id}/index.html
 */
export async function navigateToAutoWhisk(page: Page): Promise<void> {
  try {
    const extensionId = process.env.AUTO_WHISK_EXTENSION_ID || 'gedfnhdibkfgacmkbjgpfjihacalnlpn';
    const extensionUrl = `chrome-extension://${extensionId}/index.html`;

    console.log(`🔗 [AutoWhisk] Navigating to ${extensionUrl}...`);

    await page.goto(extensionUrl, { waitUntil: 'networkidle', timeout: 30000 });

    console.log('✅ [AutoWhisk] Page loaded');
  } catch (error) {
    console.error('❌ [AutoWhisk] Navigation failed:', error);
    throw new Error(`Failed to navigate to Auto Whisk: ${error.message}`);
  }
}

/**
 * Generate images using Auto Whisk extension
 *
 * @param page - Playwright page with Auto Whisk loaded
 * @param prompts - Array of image prompts (1 prompt = 1 line)
 * @param imageCount - Number of images per prompt (default: 1)
 * @param aspectRatio - Aspect ratio (default: "16:9")
 * @returns Promise that resolves when generation starts
 */
export async function generateImages(
  page: Page,
  prompts: string[],
  imageCount: number = 1,
  aspectRatio: string = '16:9'
): Promise<void> {
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

    // Find and fill the prompt textarea
    console.log('📝 [AutoWhisk] Filling prompts...');

    // Try multiple selectors in case the extension structure changes
    const promptTextarea = await page.locator('textarea').first();

    if (await promptTextarea.count() === 0) {
      throw new Error('Could not find prompt textarea');
    }

    // Fill prompts (one per line)
    const promptText = prompts.join('\n');
    await promptTextarea.fill(promptText);

    console.log(`✅ [AutoWhisk] Filled ${prompts.length} prompts`);

    // Set image count dropdown
    console.log('🔢 [AutoWhisk] Setting image count...');

    // Look for select elements or dropdowns
    const selects = await page.locator('select').all();

    // Try to find the image count dropdown (usually second select)
    let imageCountSet = false;
    for (let i = 0; i < selects.length; i++) {
      const options = await selects[i].locator('option').allTextContents();

      // Check if this select has numeric options (likely image count)
      if (options.some(opt => /^\d+$/.test(opt.trim()))) {
        await selects[i].selectOption(imageCount.toString());
        imageCountSet = true;
        console.log(`✅ [AutoWhisk] Image count set to ${imageCount}`);
        break;
      }
    }

    if (!imageCountSet) {
      console.warn('⚠️ [AutoWhisk] Could not find image count dropdown, using default');
    }

    // Set aspect ratio
    console.log('📐 [AutoWhisk] Setting aspect ratio...');

    let aspectRatioSet = false;
    for (let i = 0; i < selects.length; i++) {
      const options = await selects[i].locator('option').allTextContents();

      // Check if this select has aspect ratio options
      if (options.some(opt => opt.includes('16:9') || opt.includes('4:3'))) {
        await selects[i].selectOption({ label: aspectRatio });
        aspectRatioSet = true;
        console.log(`✅ [AutoWhisk] Aspect ratio set to ${aspectRatio}`);
        break;
      }
    }

    if (!aspectRatioSet) {
      console.warn('⚠️ [AutoWhisk] Could not find aspect ratio dropdown, using default');
    }

    // Click Start button
    console.log('▶️ [AutoWhisk] Clicking Start button...');

    const startButton = await page.getByRole('button', { name: /start/i }).first();

    if (await startButton.count() === 0) {
      throw new Error('Could not find Start button');
    }

    await startButton.click();

    console.log('✅ [AutoWhisk] Generation started');

    // Wait a moment for generation to begin
    await page.waitForTimeout(2000);

  } catch (error) {
    console.error('❌ [AutoWhisk] Generation failed:', error);
    throw new Error(`Auto Whisk generation failed: ${error.message}`);
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

      // Look for status text
      const statusText = await page.textContent('body');

      if (statusText?.includes('Ready') && !statusText?.includes('Generating')) {
        console.log('✅ [AutoWhisk] Generation complete');
        return;
      }

      // Wait before next check
      await page.waitForTimeout(5000); // 5 seconds between checks
    }

    throw new Error('Generation timeout exceeded');

  } catch (error) {
    console.error('❌ [AutoWhisk] Wait for completion failed:', error);
    throw new Error(`Failed to wait for generation: ${error.message}`);
  }
}

/**
 * Get the download folder path where Auto Whisk saves images
 * Default is <UserDownloads>/Wisk Downloads/
 */
export function getAutoWhiskDownloadFolder(): string {
  const homeDir = process.env.USERPROFILE || process.env.HOME || '';
  const downloadsPath = join(homeDir, 'Downloads', 'Wisk Downloads');

  return downloadsPath;
}

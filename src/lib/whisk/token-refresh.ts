/**
 * Whisk Token Refresher - Automated token capture via browser automation
 *
 * Uses Playwright to:
 * 1. Launch Chrome with user's existing profile (already signed in to Google)
 * 2. Navigate to Whisk
 * 3. Trigger image generation
 * 4. Intercept network request to capture Bearer token
 * 5. Validate and return token
 *
 * Requires user to be signed in to Google in their Chrome profile.
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

// ✅ FIX: Support locale-specific URLs via environment variable
// Set WHISK_LOCALE=de in .env for German, WHISK_LOCALE=en for English, etc.
const LOCALE = process.env.WHISK_LOCALE || 'de';
const WHISK_URL = `https://labs.google/fx/${LOCALE}/tools/whisk/`;
const WHISK_API_ENDPOINT = 'whisk:generateImage';
const GOOGLE_OAUTH_TOKEN_PATTERN = /^ya29\.[a-zA-Z0-9_-]{100,}$/;

// Chrome profile paths (Windows-specific)
// Use dedicated automation profile to avoid conflicts with running Chrome
const AUTOMATION_PROFILE_PATH = path.join(
  process.env.LOCALAPPDATA || '',
  'ObsidianNewsDesk',
  'chrome-automation-profile'
);

const CHROME_PROFILE_PATHS = [
  process.env.CHROME_PROFILE_PATH || AUTOMATION_PROFILE_PATH,
  AUTOMATION_PROFILE_PATH,
].filter(Boolean);

export class WhiskTokenRefresher {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private capturedToken: string | null = null;

  /**
   * Main entry point - Refresh token by launching browser and capturing from network
   */
  async refreshToken(): Promise<{ token: string; timestamp: number }> {
    const headless = process.env.WHISK_TOKEN_REFRESH_HEADLESS !== 'false'; // Default: true
    const timeout = parseInt(process.env.WHISK_TOKEN_REFRESH_TIMEOUT || '30000', 10);

    console.log(`🔄 [Token Refresh] Starting automatic token refresh (headless: ${headless})...`);

    try {
      // Launch browser with user profile
      await this.launchBrowserWithProfile(headless);

      // Navigate to Whisk and capture token
      const token = await this.captureTokenFromWhisk(timeout);

      // Validate token
      if (!this.validateTokenFormat(token)) {
        throw new Error(`Invalid token format captured: ${token.substring(0, 20)}...`);
      }

      const timestamp = Date.now();
      console.log('✅ [Token Refresh] Token captured successfully');

      return { token, timestamp };

    } catch (error) {
      console.error('❌ [Token Refresh] Failed to refresh token:', error);
      throw error;

    } finally {
      // Always cleanup browser
      await this.cleanup();
    }
  }

  /**
   * Launch Chrome with user's existing profile
   * Uses persistent context to access saved login sessions
   */
  private async launchBrowserWithProfile(headless: boolean): Promise<void> {
    // Find Chrome profile
    const profilePath = this.findChromeProfile();
    if (!profilePath) {
      throw new Error(
        `Chrome profile not found. Tried paths:\n${CHROME_PROFILE_PATHS.join('\n')}\n\n` +
        `Set CHROME_PROFILE_PATH in .env to specify custom location.`
      );
    }

    console.log(`🌐 [Token Refresh] Launching Chrome with profile: ${profilePath}`);

    try {
      // Launch with persistent context (preserves login session)
      this.context = await chromium.launchPersistentContext(profilePath, {
        headless,
        args: [
          '--disable-blink-features=AutomationControlled', // Avoid detection
          '--disable-dev-shm-usage',
          '--no-sandbox',
        ],
        ignoreDefaultArgs: ['--enable-automation'], // Hide automation indicators
      });

      console.log('✅ [Token Refresh] Browser launched successfully');

    } catch (error) {
      throw new Error(`Failed to launch browser: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Navigate to Whisk and intercept network request to capture token
   */
  private async captureTokenFromWhisk(timeout: number): Promise<string> {
    if (!this.context) {
      throw new Error('Browser context not initialized');
    }

    const page = this.context.pages()[0] || await this.context.newPage();

    // Setup network interception BEFORE navigation
    this.setupNetworkInterception(page);

    console.log(`🌐 [Token Refresh] Navigating to ${WHISK_URL}...`);

    try {
      // Navigate to Whisk
      await page.goto(WHISK_URL, {
        waitUntil: 'networkidle',
        timeout: timeout,
      });

      console.log('✅ [Token Refresh] Page loaded');

      // Check for Google 2FA or login prompts
      const needsAuth = await this.checkForAuthenticationIssues(page);

      if (needsAuth) {
        // Wait for user to complete authentication
        // Wait until we navigate to Whisk (URL contains labs.google)
        await page.waitForFunction(
          () => window.location.href.includes('labs.google/fx') && !window.location.href.includes('accounts.google'),
          { timeout: 120000 } // 2 minutes for user to log in
        );

        console.log('✅ [Token Refresh] Authentication completed');
        // Wait for page to fully load after authentication
        await page.waitForTimeout(3000);
      }

      // Trigger image generation to capture token
      await this.triggerImageGeneration(page, timeout);

      // Wait for token capture (with timeout)
      const startTime = Date.now();
      while (!this.capturedToken && (Date.now() - startTime) < timeout) {
        await page.waitForTimeout(500); // Poll every 500ms
      }

      if (!this.capturedToken) {
        throw new Error('Token not captured within timeout period');
      }

      return this.capturedToken;

    } catch (error) {
      console.error('❌ [Token Refresh] Failed to capture token:', error);

      // Log page state for debugging
      const url = page.url();
      const title = await page.title();
      console.error(`  Page URL: ${url}`);
      console.error(`  Page Title: ${title}`);

      throw error;
    }
  }

  /**
   * Setup network request interception to capture Authorization header
   */
  private setupNetworkInterception(page: Page): void {
    page.on('request', (request) => {
      const url = request.url();

      // Check if this is the Whisk API request
      if (url.includes(WHISK_API_ENDPOINT)) {
        console.log('🎯 [Token Refresh] Detected Whisk API request');

        const authHeader = request.headers()['authorization'];
        if (authHeader?.startsWith('Bearer ')) {
          const token = authHeader.replace('Bearer ', '');
          console.log(`✅ [Token Refresh] Token captured: ${token.substring(0, 20)}...`);
          this.capturedToken = token;
        } else {
          console.warn('⚠️  [Token Refresh] Authorization header missing or invalid');
        }
      }
    });
  }

  /**
   * Check for authentication issues (2FA, login prompts)
   * Returns true if user needs to authenticate, false otherwise
   */
  private async checkForAuthenticationIssues(page: Page): Promise<boolean> {
    const url = page.url();
    const title = await page.title();

    // Check for Google login page
    if (url.includes('accounts.google.com/signin') || url.includes('accounts.google.com/ServiceLogin')) {
      console.log('⚠️  [Token Refresh] Google login required');
      console.log('   📝 Please sign in to Google in the browser window');
      console.log('   ⏳ Waiting for you to complete login...');
      return true; // Needs authentication
    }

    // Check for 2FA prompt (be more specific - check title, not just URL)
    if (title.includes('2-Step Verification') || title.includes('Verify')) {
      console.log('⚠️  [Token Refresh] 2FA verification required');
      console.log('   📝 Please complete 2-Step Verification in the browser window');
      console.log('   ⏳ Waiting for you to complete 2FA...');
      return true; // Needs 2FA
    }

    return false; // No authentication needed
  }

  /**
   * Trigger simple image generation to capture token from network request
   */
  private async triggerImageGeneration(page: Page, timeout: number): Promise<void> {
    console.log('🎨 [Token Refresh] Triggering image generation...');

    try {
      // Wait for Whisk interface to load
      // Try multiple selectors to find the input or "Surprise me" button
      const inputSelector = 'textarea[placeholder*="Describe"], input[placeholder*="prompt"]';
      const surpriseButtonSelector = 'button:has-text("Surprise me")';

      // Wait for either input or button
      await Promise.race([
        page.waitForSelector(inputSelector, { timeout: 15000 }).catch(() => null),
        page.waitForSelector(surpriseButtonSelector, { timeout: 15000 }).catch(() => null),
      ]);

      // Try "Surprise me" button first (easiest)
      const surpriseButton = await page.$(surpriseButtonSelector);
      if (surpriseButton) {
        console.log('🎲 [Token Refresh] Clicking "Surprise me" button');
        await surpriseButton.click();
        return;
      }

      // Fallback: Enter simple prompt
      const input = await page.$(inputSelector);
      if (input) {
        console.log('⌨️  [Token Refresh] Entering simple prompt');
        await input.fill('test');

        // Find and click generate button
        const generateButton = await page.$('button:has-text("Generate")');
        if (generateButton) {
          await generateButton.click();
          return;
        }
      }

      throw new Error('Could not find input field or generate button on Whisk page');

    } catch (error) {
      console.error('❌ [Token Refresh] Failed to trigger generation:', error);
      throw new Error(`Failed to trigger image generation: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate token format (Google OAuth tokens start with ya29.)
   */
  private validateTokenFormat(token: string): boolean {
    return GOOGLE_OAUTH_TOKEN_PATTERN.test(token);
  }

  /**
   * Find Chrome user data directory
   * Creates automation profile if it doesn't exist
   */
  private findChromeProfile(): string | null {
    for (const profilePath of CHROME_PROFILE_PATHS) {
      if (!profilePath) continue;

      // If it exists, use it
      if (fs.existsSync(profilePath)) {
        console.log(`✅ [Token Refresh] Found Chrome profile: ${profilePath}`);
        return profilePath;
      }

      // If it's the automation profile path, create it
      if (profilePath === AUTOMATION_PROFILE_PATH) {
        try {
          fs.mkdirSync(profilePath, { recursive: true });
          console.log(`✅ [Token Refresh] Created automation profile: ${profilePath}`);
          console.log(`   📝 Note: You'll need to log into Google on first run`);
          return profilePath;
        } catch (error) {
          console.error(`⚠️  [Token Refresh] Failed to create automation profile: ${error}`);
          continue;
        }
      }
    }

    return null;
  }

  /**
   * Cleanup browser resources
   */
  private async cleanup(): Promise<void> {
    try {
      if (this.context) {
        await this.context.close();
        console.log('✅ [Token Refresh] Browser closed');
      }
    } catch (error) {
      console.error('⚠️  [Token Refresh] Error during cleanup:', error);
    }

    this.browser = null;
    this.context = null;
    this.capturedToken = null;
  }
}

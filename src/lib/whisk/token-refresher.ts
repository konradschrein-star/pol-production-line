/**
 * Whisk Token Auto-Refresher (On-Demand)
 *
 * Automatically refreshes Google Whisk API tokens when 401/400 errors occur.
 * Only runs when needed, not on a schedule.
 */

import puppeteer, { Browser } from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

const WHISK_URL = 'https://labs.google.com/whisk';
const ENV_PATH = path.join(process.cwd(), '.env');
const CHROME_PROFILE_PATH = path.join(
  process.env.USERPROFILE || process.env.HOME || '',
  '.chrome-whisk-profile'
);

export class WhiskTokenRefresher {
  private isRefreshing = false;
  private lastRefreshTime: number = 0;
  private MIN_REFRESH_INTERVAL = 10000; // Don't refresh more than once per 10 seconds

  /**
   * Refresh token on-demand (called when API returns 401/400)
   */
  async refreshTokenOnError(): Promise<string> {
    // Prevent rapid refresh attempts
    const timeSinceLastRefresh = Date.now() - this.lastRefreshTime;
    if (this.isRefreshing) {
      throw new Error('Token refresh already in progress');
    }
    if (timeSinceLastRefresh < this.MIN_REFRESH_INTERVAL) {
      throw new Error(`Too soon to refresh again (wait ${Math.ceil((this.MIN_REFRESH_INTERVAL - timeSinceLastRefresh) / 1000)}s)`);
    }

    this.isRefreshing = true;
    console.log('🔄 [Whisk Token] API returned 401/400 - refreshing token...');

    try {
      const newToken = await this.fetchTokenFromBrowser();
      await this.updateEnvFile(newToken);

      this.lastRefreshTime = Date.now();
      console.log(`✅ [Whisk Token] Refreshed successfully`);
      console.log(`   Token: ${newToken.substring(0, 20)}...${newToken.substring(newToken.length - 10)}`);

      return newToken;
    } catch (error) {
      console.error('❌ [Whisk Token] Refresh failed:', error);
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Fetch fresh token from browser
   */
  private async fetchTokenFromBrowser(): Promise<string> {
    let browser: Browser | null = null;

    try {
      console.log('   Launching Chrome with your Google profile...');

      // Launch browser with persistent profile (for Google auth)
      browser = await puppeteer.launch({
        headless: false, // Show browser so user can see what's happening
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
        ],
        userDataDir: CHROME_PROFILE_PATH,
      });

      const page = await browser.newPage();

      // Set up request interceptor to capture auth token
      let capturedToken: string | null = null;

      await page.setRequestInterception(true);

      page.on('request', (request) => {
        const url = request.url();

        // Capture authorization header from Whisk API calls
        if (url.includes('whisk:generateImage') || url.includes('aisandbox-pa.googleapis.com')) {
          const headers = request.headers();
          const authHeader = headers['authorization'];
          if (authHeader && authHeader.startsWith('Bearer ')) {
            capturedToken = authHeader.replace('Bearer ', '');
            console.log('   ✅ Captured auth token from request');
          }
        }

        request.continue();
      });

      // Navigate to Whisk
      console.log('   Opening Whisk...');
      await page.goto(WHISK_URL, {
        waitUntil: 'networkidle2',
        timeout: 60000,
      });

      console.log('   Waiting for page to load...');
      await page.waitForTimeout(5000);

      // Check if we need to authenticate
      const currentUrl = page.url();
      if (currentUrl.includes('accounts.google.com')) {
        console.log('   ⚠️  Google login required!');
        console.log('   👉 Please sign in to Google in the browser window');
        console.log('   Waiting for authentication...');

        // Wait for redirect back to Whisk
        await page.waitForNavigation({
          waitUntil: 'networkidle2',
          timeout: 120000, // 2 minutes for user to log in
        });

        console.log('   ✅ Authentication complete');
        await page.waitForTimeout(3000);
      }

      // Wait a bit for any auto-generated requests
      console.log('   Waiting for automatic API calls...');
      await page.waitForTimeout(8000);

      // If no token captured yet, try to trigger a test generation
      if (!capturedToken) {
        console.log('   No auto-request detected, checking page elements...');

        // Look for clickable elements that might trigger generation
        const possibleTriggers = [
          'button[aria-label*="generate" i]',
          'button:has-text("Generate")',
          '[data-test-id*="generate"]',
          'button.generate',
        ];

        for (const selector of possibleTriggers) {
          try {
            const element = await page.$(selector);
            if (element) {
              console.log(`   Found trigger: ${selector}`);
              await element.click();
              await page.waitForTimeout(5000);
              if (capturedToken) break;
            }
          } catch (e) {
            // Continue trying other selectors
          }
        }
      }

      // Final wait
      await page.waitForTimeout(3000);

      await browser.close();

      if (!capturedToken) {
        throw new Error(
          'Could not capture auth token. Please:\n' +
          '1. Open https://labs.google.com/whisk manually\n' +
          '2. Open DevTools (F12) → Network tab\n' +
          '3. Generate an image\n' +
          '4. Find "generateImage" request → Copy Authorization header\n' +
          '5. Update WHISK_API_TOKEN in .env manually'
        );
      }

      return capturedToken;
    } catch (error) {
      if (browser) {
        await browser.close().catch(() => {});
      }
      throw error;
    }
  }

  /**
   * Update .env file with new token
   */
  private async updateEnvFile(newToken: string): Promise<void> {
    try {
      const envContent = await fs.readFile(ENV_PATH, 'utf-8');
      const lines = envContent.split('\n');

      // Find and update WHISK_API_TOKEN line
      let updated = false;
      const newLines = lines.map((line) => {
        if (line.startsWith('WHISK_API_TOKEN=')) {
          updated = true;
          return `WHISK_API_TOKEN=${newToken}`;
        }
        return line;
      });

      // If token line doesn't exist, add it
      if (!updated) {
        newLines.push(`WHISK_API_TOKEN=${newToken}`);
      }

      await fs.writeFile(ENV_PATH, newLines.join('\n'), 'utf-8');
      console.log('   ✅ Updated .env file');
    } catch (error) {
      console.error('   ❌ Failed to update .env file:', error);
      throw error;
    }
  }
}

// Singleton instance
let refresher: WhiskTokenRefresher | null = null;

/**
 * Get or create the token refresher instance
 */
export function getTokenRefresher(): WhiskTokenRefresher {
  if (!refresher) {
    refresher = new WhiskTokenRefresher();
  }
  return refresher;
}

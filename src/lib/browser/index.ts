import { chromium, BrowserContext, Page } from 'playwright';
import { existsSync } from 'fs';
import { join, resolve } from 'path';

export interface BrowserConfig {
  extensionId?: string;
  userDataDir?: string;
  headless?: boolean;
}

export class BrowserManager {
  private context: BrowserContext | null = null;
  private config: BrowserConfig;

  constructor(config: BrowserConfig = {}) {
    this.config = {
      extensionId: config.extensionId || process.env.AUTO_WHISK_EXTENSION_ID,
      userDataDir: config.userDataDir || process.env.PLAYWRIGHT_USER_DATA_DIR || './playwright-data',
      headless: config.headless !== undefined ? config.headless : false,
    };
  }

  /**
   * Launch browser with persistent context for cookie preservation
   * This allows Google login sessions to persist across browser restarts
   */
  async launch(): Promise<BrowserContext> {
    try {
      console.log('🌐 [Browser] Launching Chromium with persistent context...');
      console.log(`   User Data Dir: ${this.config.userDataDir}`);
      console.log(`   Extension ID: ${this.config.extensionId}`);
      console.log(`   Headless: ${this.config.headless}`);

      // Resolve user data directory to absolute path
      const userDataDir = resolve(this.config.userDataDir!);

      // Get extension path
      const extensionPath = this.getExtensionPath();

      // Launch args
      const args = [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox',
      ];

      // Add extension loading args if extension found
      if (extensionPath) {
        args.push(`--disable-extensions-except=${extensionPath}`);
        args.push(`--load-extension=${extensionPath}`);
        console.log(`   Extension Path: ${extensionPath}`);
      } else {
        console.warn('⚠️ [Browser] Extension not found, continuing without Auto Whisk');
      }

      // Launch persistent context (cookies auto-saved)
      this.context = await chromium.launchPersistentContext(userDataDir, {
        headless: this.config.headless,
        args,
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });

      console.log('✅ [Browser] Launched successfully with persistent context');

      // Verify Google login status
      await this.verifyGoogleLogin();

      return this.context;
    } catch (error) {
      console.error('❌ [Browser] Launch failed:', error);
      throw new Error(`Browser launch failed: ${error.message}`);
    }
  }

  /**
   * Get extension path from extension ID
   * Searches Chrome and Edge user data directories
   */
  private getExtensionPath(): string | null {
    if (!this.config.extensionId) {
      return null;
    }

    const localAppData = process.env.LOCALAPPDATA;
    if (!localAppData) {
      console.warn('⚠️ [Browser] LOCALAPPDATA environment variable not found');
      return null;
    }

    // Possible browser extension directories
    const possiblePaths = [
      join(localAppData, 'Microsoft', 'Edge', 'User Data', 'Default', 'Extensions', this.config.extensionId),
      join(localAppData, 'Google', 'Chrome', 'User Data', 'Default', 'Extensions', this.config.extensionId),
    ];

    for (const basePath of possiblePaths) {
      if (existsSync(basePath)) {
        try {
          // Get all version directories
          const fs = require('fs');
          const versions = fs.readdirSync(basePath);

          if (versions.length === 0) {
            continue;
          }

          // Sort versions descending and take the latest
          versions.sort((a: string, b: string) => b.localeCompare(a, undefined, { numeric: true }));
          const latestVersion = versions[0];
          const extensionPath = join(basePath, latestVersion);

          console.log(`✅ [Browser] Found extension: ${extensionPath}`);
          return extensionPath;
        } catch (error) {
          console.warn(`⚠️ [Browser] Error reading extension directory ${basePath}:`, error);
        }
      }
    }

    console.warn(`⚠️ [Browser] Extension not found: ${this.config.extensionId}`);
    return null;
  }

  /**
   * Verify Google login status
   * Checks if the user is logged into Google
   */
  private async verifyGoogleLogin(): Promise<void> {
    const page = await this.context!.newPage();

    try {
      console.log('🔐 [Browser] Verifying Google login status...');

      await page.goto('https://accounts.google.com', {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      // Wait a moment for page to render
      await page.waitForTimeout(2000);

      // Check if logged in by looking for "Sign out" or account email
      const isLoggedIn = await page.evaluate(() => {
        const bodyText = document.body.innerText.toLowerCase();
        return bodyText.includes('sign out') ||
               document.querySelector('[data-email]') !== null ||
               document.querySelector('[aria-label*="account"]') !== null;
      });

      if (isLoggedIn) {
        console.log('✅ [Browser] Google login verified - user is logged in');
        await page.close();
      } else {
        console.warn('⚠️ [Browser] NOT logged into Google!');
        console.warn('   Please log in manually in the browser window.');
        console.warn('   The browser will remain open for manual login.');
        // Don't close the page - let user log in manually
      }
    } catch (error) {
      console.error('❌ [Browser] Google login verification failed:', error);
      console.warn('   Continuing anyway - login may be required during image generation');
      await page.close().catch(() => {});
    }
  }

  /**
   * Create a new page/tab
   */
  async newPage(): Promise<Page> {
    if (!this.context) {
      throw new Error('Browser not launched. Call launch() first.');
    }

    const page = await this.context.newPage();
    return page;
  }

  /**
   * Close a specific page
   */
  async closePage(page: Page): Promise<void> {
    try {
      await page.close();
      console.log('🗑️ [Browser] Page closed');
    } catch (error) {
      console.error('❌ [Browser] Failed to close page:', error);
    }
  }

  /**
   * Close browser and all pages
   * With persistent context, this also saves cookies automatically
   */
  async close(): Promise<void> {
    try {
      if (this.context) {
        await this.context.close();
        this.context = null;
      }

      console.log('✅ [Browser] Closed successfully (cookies saved)');
    } catch (error) {
      console.error('❌ [Browser] Failed to close:', error);
    }
  }

  /**
   * Get the current context
   */
  getContext(): BrowserContext | null {
    return this.context;
  }

  /**
   * Check if browser is running
   */
  isRunning(): boolean {
    return this.context !== null;
  }
}

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
      userDataDir: config.userDataDir || process.env.PLAYWRIGHT_USER_DATA_DIR,
      headless: config.headless !== undefined ? config.headless : false,
    };
  }

  /**
   * Launch browser with automation profile using Playwright persistent context
   * Extensions installed in the profile load automatically
   */
  async launch(): Promise<BrowserContext> {
    try {
      console.log('🌐 [Browser] Launching Edge with persistent context...');

      // Use Edge browser (better Playwright support than Comet)
      // Dedicated automation profile to avoid locks
      const edgeExecutable = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
      const edgeUserData = 'C:\\Users\\konra\\AppData\\Local\\ObsidianNewsDesk\\edge-automation';

      console.log(`   Edge Executable: ${edgeExecutable}`);
      console.log(`   Edge Profile: ${edgeUserData}`);
      console.log(`   Headless: ${this.config.headless}`);

      // Launch Playwright with Edge using dedicated automation profile
      // Extensions from the profile load automatically!
      this.context = await chromium.launchPersistentContext(edgeUserData, {
        executablePath: edgeExecutable,
        headless: this.config.headless,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--no-sandbox',
        ],
        // CRITICAL: Allow extensions to load from the profile
        ignoreDefaultArgs: ['--disable-extensions', '--disable-component-extensions-with-background-pages'],
        acceptDownloads: true,
        viewport: { width: 1920, height: 1080 },
      });

      console.log('✅ [Browser] Launched successfully');
      console.log('ℹ️  [Browser] Using Google login and extensions from automation profile');

      return this.context;
    } catch (error) {
      console.error('❌ [Browser] Launch failed:', error);
      throw new Error(`Browser launch failed: ${error instanceof Error ? error.message : String(error)}`);
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
   */
  async close(): Promise<void> {
    try {
      if (this.context) {
        await this.context.close();
        this.context = null;
      }

      console.log('✅ [Browser] Closed successfully');
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

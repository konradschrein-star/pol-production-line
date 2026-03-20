import { Page } from 'playwright';

/**
 * Ban/Rate Limit Detection for Google Wisk
 *
 * Detects when Google Wisk is blocking or rate limiting requests
 * to prevent account bans from automated usage.
 */

export interface BanDetectionResult {
  isBanned: boolean;
  reason?: string;
  type?: 'captcha' | 'login_required' | 'rate_limit' | 'session_expired' | 'unknown';
}

/**
 * Known ban/rate limit indicators
 * These strings in page content suggest Google is blocking requests
 */
const BAN_INDICATORS = [
  // Rate limiting
  'rate limit',
  'too many requests',
  'quota exceeded',
  'try again later',
  '429',

  // Captcha
  'verify you\'re not a robot',
  'captcha',
  'unusual traffic',

  // Session expired
  'sign in to continue',
  'login required',
  'session expired',
  'authentication required',

  // Automated requests detection
  'automated requests',
  'suspicious activity',
  'temporarily blocked',
  'access denied',
  'your account has been disabled',
];

/**
 * Check if page shows ban/rate limit indicators
 * @param page - Playwright page to check
 * @returns Detection result with ban status and type
 */
export async function detectBan(page: Page): Promise<BanDetectionResult> {
  try {
    // Get page text content (case-insensitive)
    const pageText = await page.evaluate(() => document.body.innerText.toLowerCase());
    const pageUrl = page.url();

    console.log(`🔍 [BanDetect] Checking page: ${pageUrl.substring(0, 100)}...`);

    // Check for captcha
    if (
      pageText.includes('captcha') ||
      pageText.includes('verify you\'re not a robot') ||
      pageUrl.includes('google.com/recaptcha') ||
      pageUrl.includes('sorry/index')
    ) {
      console.warn('⚠️ [BanDetect] CAPTCHA DETECTED');
      return {
        isBanned: true,
        reason: 'Captcha challenge detected - manual verification required',
        type: 'captcha',
      };
    }

    // Check for login requirement (session expired)
    if (
      pageText.includes('sign in') ||
      pageText.includes('login required') ||
      pageUrl.includes('accounts.google.com/ServiceLogin') ||
      pageUrl.includes('accounts.google.com/signin')
    ) {
      console.warn('⚠️ [BanDetect] LOGIN REQUIRED');
      return {
        isBanned: true,
        reason: 'Google login required - session may have expired',
        type: 'login_required',
      };
    }

    // Check for rate limiting indicators
    for (const indicator of BAN_INDICATORS) {
      if (pageText.includes(indicator)) {
        console.warn(`⚠️ [BanDetect] RATE LIMIT INDICATOR: "${indicator}"`);
        return {
          isBanned: true,
          reason: `Rate limit indicator detected: "${indicator}"`,
          type: 'rate_limit',
        };
      }
    }

    // Check for error messages in Auto Whisk UI
    const errorElements = await page.locator('.error, [class*="error"], [class*="Error"]').all();
    for (const element of errorElements) {
      const errorText = await element.textContent();
      if (errorText && errorText.length > 0) {
        console.warn(`⚠️ [BanDetect] ERROR UI: ${errorText}`);
        return {
          isBanned: true,
          reason: `Error in UI: ${errorText}`,
          type: 'unknown',
        };
      }
    }

    // Check for generic error messages
    if (pageText.includes('something went wrong') || pageText.includes('error occurred')) {
      console.warn('⚠️ [BanDetect] GENERIC ERROR');
      return {
        isBanned: true,
        reason: 'Generic error message detected',
        type: 'unknown',
      };
    }

    // No ban indicators found
    return { isBanned: false };

  } catch (error) {
    console.error('❌ [BanDetect] Detection error:', error);
    // Don't report as banned if detection itself fails
    return { isBanned: false };
  }
}

/**
 * Monitor page for ban indicators during a long-running operation
 * Checks periodically and resolves when a ban is detected
 *
 * @param page - Playwright page to monitor
 * @param checkInterval - Milliseconds between checks (default: 5000)
 * @param maxDuration - Maximum monitoring duration in ms (default: 180000 = 3 min)
 * @returns Promise that resolves with ban detection result (or never if no ban detected)
 */
export async function monitorForBan(
  page: Page,
  checkInterval: number = 5000,
  maxDuration: number = 180000
): Promise<BanDetectionResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let intervalId: NodeJS.Timeout;

    const checkForBan = async () => {
      try {
        // Check if monitoring duration exceeded
        if (Date.now() - startTime > maxDuration) {
          clearInterval(intervalId);
          console.log('⏰ [BanDetect] Monitoring duration exceeded, stopping');
          return;
        }

        // Check for ban
        const result = await detectBan(page);
        if (result.isBanned) {
          clearInterval(intervalId);
          console.error(`🚫 [BanDetect] BAN DETECTED: ${result.reason}`);
          resolve(result);
        }
      } catch (error) {
        console.error('❌ [BanDetect] Monitor error:', error);
        // Continue monitoring even if one check fails
      }
    };

    // Start periodic checking
    intervalId = setInterval(checkForBan, checkInterval);

    // Initial check
    checkForBan();
  });
}

/**
 * Wait with timeout that can be cancelled by ban detection
 * Useful for waiting for operations while monitoring for bans
 *
 * @param page - Playwright page to monitor
 * @param duration - Duration to wait in ms
 * @param checkInterval - Ban check interval in ms (default: 5000)
 * @returns Promise that resolves normally or rejects if ban detected
 */
export async function waitWithBanDetection(
  page: Page,
  duration: number,
  checkInterval: number = 5000
): Promise<void> {
  return new Promise((resolve, reject) => {
    let resolved = false;

    // Set timeout for normal completion
    const timeoutId = setTimeout(() => {
      resolved = true;
      resolve();
    }, duration);

    // Monitor for bans
    monitorForBan(page, checkInterval, duration).then((banResult) => {
      if (!resolved) {
        clearTimeout(timeoutId);
        reject(new Error(`Generation blocked: ${banResult.reason}`));
      }
    });
  });
}

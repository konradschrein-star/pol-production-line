/**
 * Browser Extension Integration for Token Refresh
 *
 * When the backend detects a 401 error from Whisk API, it can trigger
 * the browser extension to automatically refresh the token.
 *
 * How it works:
 * 1. Backend calls triggerExtensionRefresh()
 * 2. Opens the extension status page (which communicates with the extension)
 * 3. Extension receives the message and opens Whisk in background tab
 * 4. Auth session endpoint is called automatically on page load
 * 5. Extension captures token from response and sends to backend API
 * 6. Backend retries the original request with new token
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';

const execAsync = promisify(exec);

/**
 * Lazy validation: Get extension ID from environment
 * Only validates when actually needed (not at module load time)
 */
function getExtensionId(): string {
  const extensionId = process.env.AUTO_WHISK_EXTENSION_ID;
  if (!extensionId) {
    throw new Error(
      'AUTO_WHISK_EXTENSION_ID not configured. ' +
      'Add AUTO_WHISK_EXTENSION_ID=gcgblhgncmhjchllkcpcneeibddhmbbe to your .env file.'
    );
  }
  return extensionId;
}

/**
 * Lazy validation: Get backend URL from environment
 * Only validates when actually needed (not at module load time)
 */
function getBackendUrl(): string {
  const backendUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!backendUrl) {
    // Allow localhost fallback only in development
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'NEXT_PUBLIC_APP_URL not configured for production. ' +
        'Set NEXT_PUBLIC_APP_URL in .env (e.g., https://your-domain.com)'
      );
    }
    console.warn('⚠️  NEXT_PUBLIC_APP_URL not set, using localhost (development only)');
    return 'http://localhost:8347';
  }
  return backendUrl;
}

export interface ExtensionRefreshResult {
  success: boolean;
  token?: string;
  method: 'extension' | 'fallback';
  error?: string;
}

/**
 * Trigger browser extension to refresh token
 *
 * Strategy:
 * 1. Send HTTP request to extension status endpoint (extension listens for this)
 * 2. Extension opens Whisk page in background tab
 * 3. Auth session endpoint fires automatically
 * 4. Extension captures token and sends to backend
 * 5. Poll backend API to get the new token
 *
 * @param timeout Max time to wait for token (default: 15 seconds)
 * @returns Token refresh result
 */
export async function triggerExtensionRefresh(timeout: number = 15000): Promise<ExtensionRefreshResult> {
  console.log('🔄 [Extension Integration] Triggering extension token refresh...');

  try {
    // Trigger extension via chrome:// URL (opens extension side panel)
    // The extension will detect this and start the refresh process
    const extensionUrl = `chrome-extension://${getExtensionId()}/popup-enhanced-fixed.html?action=refresh`;

    // Launch Chrome with extension URL (user's default Chrome profile)
    // This will open the extension popup and trigger the refresh
    const command = process.platform === 'win32'
      ? `start chrome "${extensionUrl}"`
      : process.platform === 'darwin'
        ? `open -a "Google Chrome" "${extensionUrl}"`
        : `google-chrome "${extensionUrl}"`;

    console.log('🌐 [Extension Integration] Opening extension popup...');

    await execAsync(command).catch((error) => {
      console.warn('⚠️  [Extension Integration] Failed to open extension popup (Chrome may not be installed)');
      console.warn('   Continuing anyway - extension may still be running');
    });

    // Wait for extension to capture and send token to backend
    // Poll the token store to detect when new token arrives
    console.log('⏳ [Extension Integration] Waiting for extension to capture token...');

    const startTime = Date.now();
    const pollInterval = 500; // Poll every 500ms

    while (Date.now() - startTime < timeout) {
      // Check if new token was written to .env by extension
      const { WhiskTokenStore } = await import('./token-store');
      const currentToken = WhiskTokenStore.getToken();

      // Check timestamp to see if token was recently updated
      const tokenTimestamp = WhiskTokenStore.getLastUpdateTime();
      const tokenAge = Date.now() - tokenTimestamp;

      if (tokenAge < timeout) {
        // Token was updated recently - likely from extension
        console.log('✅ [Extension Integration] New token detected!');
        return {
          success: true,
          token: currentToken,
          method: 'extension',
        };
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    // Timeout - extension did not provide token
    console.warn('⏱️  [Extension Integration] Timeout waiting for extension token');
    return {
      success: false,
      method: 'extension',
      error: 'Extension did not provide token within timeout period',
    };

  } catch (error) {
    console.error('❌ [Extension Integration] Failed to trigger extension:', error);
    return {
      success: false,
      method: 'extension',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Send direct message to extension (alternative approach)
 *
 * This uses Chrome's native messaging protocol if configured.
 * Requires extension to have native messaging host setup.
 *
 * @deprecated Use triggerExtensionRefresh() instead
 */
export async function sendExtensionMessage(message: any): Promise<any> {
  throw new Error('Native messaging not implemented - use triggerExtensionRefresh() instead');
}

/**
 * Check if extension is installed and running
 *
 * @returns true if extension can be detected
 */
export async function isExtensionAvailable(): Promise<boolean> {
  try {
    // Try to fetch extension status endpoint
    const response = await axios.get(`${getBackendUrl()}/api/whisk/extension-status`, {
      timeout: 2000,
    });

    return response.status === 200 && response.data.extensionInstalled === true;

  } catch (error) {
    return false;
  }
}

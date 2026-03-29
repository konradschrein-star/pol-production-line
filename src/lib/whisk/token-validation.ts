/**
 * Whisk Token Validation
 *
 * Validates OAuth tokens before image generation to prevent 401 errors
 * Triggers extension refresh if token is expired or invalid
 */

/**
 * Validate Whisk API token
 *
 * Tests token by calling Google's auth session endpoint
 * This is the same endpoint the extension uses to capture tokens
 *
 * @returns true if token is valid, false if expired/invalid
 */
export async function validateWhiskToken(): Promise<boolean> {
  try {
    const token = process.env.WHISK_API_TOKEN;

    if (!token) {
      console.warn('[Token Validation] ⚠️  No token configured in environment');
      return false;
    }

    // Test token with Google auth session endpoint
    // This endpoint returns 200 for valid tokens, 401 for expired/invalid
    const response = await fetch('https://labs.google/fx/api/auth/session', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (response.status === 200) {
      console.log('[Token Validation] ✅ Token is valid');
      return true;
    } else if (response.status === 401) {
      console.warn('[Token Validation] ⚠️  Token expired or invalid (401)');
      return false;
    } else {
      console.warn(`[Token Validation] ⚠️  Unexpected response status: ${response.status}`);
      return false;
    }

  } catch (error) {
    console.error('[Token Validation] ❌ Validation failed:', error);
    return false;
  }
}

/**
 * Get token age from storage
 *
 * Reads token timestamp from Chrome extension storage
 * Returns age in milliseconds
 *
 * @returns Token age in milliseconds, or null if unavailable
 */
export async function getTokenAge(): Promise<number | null> {
  try {
    // For now, we don't have direct access to Chrome extension storage from Node.js
    // This would require native messaging or a shared storage mechanism
    // For simplicity, we'll rely on the validateWhiskToken() API call

    console.log('[Token Validation] ℹ️  Token age check not implemented (use validateWhiskToken instead)');
    return null;

  } catch (error) {
    console.error('[Token Validation] ❌ Failed to get token age:', error);
    return null;
  }
}

/**
 * Check if token needs refresh
 *
 * Returns true if token is older than 50 minutes (approaching 60-minute expiry)
 *
 * @returns true if token needs refresh, false otherwise
 */
export async function tokenNeedsRefresh(): Promise<boolean> {
  // For now, just validate the token with the API
  // In the future, could check storage timestamp if available
  const isValid = await validateWhiskToken();

  return !isValid; // Need refresh if not valid
}

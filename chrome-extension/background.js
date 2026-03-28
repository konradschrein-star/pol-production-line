/**
 * Whisk Token Manager - Background Service Worker
 * Professional OAuth token management with auto-refresh
 */

const CONFIG = {
  BACKEND_URL: 'http://localhost:8347',
  API_ENDPOINT: '/api/whisk/token',
  WHISK_URL: 'https://labs.google/fx/tools/whisk/project',
  AUTH_SESSION_URL: 'https://labs.google/fx/api/auth/session',
  TOKEN_REFRESH_INTERVAL: 12 * 60 * 60 * 1000, // 12 hours
  ALARM_NAME: 'tokenRefresh',
};

let state = {
  lastToken: null,
  lastTokenTime: 0,
  tokenExpires: null,
  isRefreshing: false,
  backendConnected: false,
  errorLog: [],
  lastAuthSessionFetch: 0,  // Track last time we fetched auth session
};

/**
 * Log error to storage and console
 */
async function logError(message) {
  console.error('[Whisk Manager] ERROR:', message);

  const error = {
    timestamp: Date.now(),
    message: message,
  };

  state.errorLog.unshift(error);
  if (state.errorLog.length > 50) state.errorLog = state.errorLog.slice(0, 50);

  await chrome.storage.local.set({ errorLog: state.errorLog });
}

/**
 * Show notification
 */
function showNotification(title, message, type = 'basic') {
  chrome.notifications.create({
    type: type,
    iconUrl: 'icon128.png',
    title: title,
    message: message,
    priority: 2,
  });
}

/**
 * Initialize extension on install/update
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[Whisk Manager] 🚀 Extension installed/updated');

  // Load saved state
  const data = await chrome.storage.local.get(['lastToken', 'lastTokenTime', 'tokenExpires']);
  if (data.lastToken) {
    state.lastToken = data.lastToken;
    state.lastTokenTime = data.lastTokenTime || 0;
    state.tokenExpires = data.tokenExpires || null;
    console.log('[Whisk Manager] 📦 Restored token from storage');

    // Send to backend immediately
    await sendTokenToBackend(data.lastToken, true);
  } else {
    // NO TOKEN YET - Auto-capture on first install
    console.log('[Whisk Manager] 🔑 No token found - auto-capturing...');

    if (details.reason === 'install') {
      // Wait 2 seconds for extension to fully initialize
      setTimeout(async () => {
        await refreshToken(); // This will open Whisk in background and capture token
      }, 2000);
    }
  }

  // Set up periodic refresh alarm (every 12 hours)
  chrome.alarms.create(CONFIG.ALARM_NAME, {
    periodInMinutes: 12 * 60,  // 720 minutes = 12 hours
  });

  console.log('[Whisk Manager] ⏰ Auto-refresh alarm set (every 12 hours)');
});

/**
 * Intercept auth session responses to extract access_token
 * This is the CORRECT way to capture tokens - they come in the response body, not request headers!
 */
chrome.webRequest.onCompleted.addListener(
  async (details) => {
    try {
      // CRITICAL: Rate limit auth session fetches to prevent spam
      // Don't fetch more than once every 10 seconds
      const now = Date.now();
      if (now - state.lastAuthSessionFetch < 10000) {
        // Silently skip - no need to spam logs
        return;
      }
      state.lastAuthSessionFetch = now;

      // Fetch the auth session to get the response body
      // Note: This works because the session endpoint returns JSON with access_token
      const response = await fetch(details.url, {
        credentials: 'include',  // Include cookies for authentication
        cache: 'no-cache'
      });

      if (!response.ok) {
        // Only log errors, not every auth check
        if (response.status !== 401 && response.status !== 403) {
          console.error('[Whisk Manager] Auth session failed:', response.status);
        }
        return;
      }

      const data = await response.json();

      // Extract access_token from response
      if (data.access_token && data.expires) {
        const token = data.access_token;
        const expiresISO = data.expires;

        // Only process if token is different from current
        if (token !== state.lastToken) {
          // Validate token format (OAuth2 token starting with ya29.)
          if (isValidWhiskToken(token)) {
            const expiresAt = new Date(expiresISO).getTime();
            const now = Date.now();
            const validityHours = ((expiresAt - now) / (1000 * 60 * 60)).toFixed(1);

            // CRITICAL: Skip expired tokens to prevent infinite loop
            if (expiresAt < now) {
              console.warn(`[Whisk Manager] ⏰ Skipping EXPIRED token (expired ${Math.abs(validityHours)} hours ago)`);
              return;
            }

            // CRITICAL: Debounce - don't process if we just processed a token within last 30 seconds
            if (now - state.lastTokenTime < 30000) {
              console.log('[Whisk Manager] 🚫 Debouncing - ignoring duplicate token capture (< 30s since last)');
              return;
            }

            console.log('[Whisk Manager] 🔑 New access token captured!');
            console.log(`[Whisk Manager] Token expires: ${expiresISO} (${validityHours} hours)`);

            await handleNewToken(token, expiresISO);
          } else {
            console.warn('[Whisk Manager] Invalid token format:', token.substring(0, 10) + '...');
          }
        }
        // Silent if token unchanged - no need to spam logs
      }

    } catch (error) {
      // Only log if it's not a network/fetch error (which can happen frequently)
      if (error.message && !error.message.includes('fetch')) {
        console.error('[Whisk Manager] Failed to parse auth session:', error);
      }
    }
  },
  { urls: ['https://labs.google/fx/api/auth/session'] }
);

/**
 * Validate Whisk API token format
 * OAuth2 tokens from Google start with "ya29." and are typically 300-500 chars
 */
function isValidWhiskToken(token) {
  if (!token.startsWith('ya29.')) {
    console.warn('[Whisk Manager] Token does not start with ya29.');
    return false;
  }

  // Real token format: ya29.a0Aa7MYipj... (base64url characters)
  if (!/^ya29\.a0[A-Za-z0-9_-]{200,600}$/.test(token)) {
    console.warn('[Whisk Manager] Token format mismatch (expected 200-600 chars after ya29.a0)');
    return false;
  }

  return true;
}

/**
 * Handle alarm for auto-refresh
 */
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === CONFIG.ALARM_NAME) {
    console.log('[Whisk Manager] ⏰ Auto-refresh alarm triggered');
    await refreshToken();
  }
});

/**
 * Handle new token capture
 */
async function handleNewToken(token, expiresISO = null) {
  const isUpdate = !!state.lastToken;

  state.lastToken = token;
  state.lastTokenTime = Date.now();

  // Parse and store expiration if provided
  if (expiresISO) {
    state.tokenExpires = new Date(expiresISO).getTime();
  }

  // Save to storage
  await chrome.storage.local.set({
    lastToken: token,
    lastTokenTime: state.lastTokenTime,
    tokenExpires: state.tokenExpires,
  });

  // Send to backend with expiration info
  const success = await sendTokenToBackend(token, false, expiresISO);

  if (success) {
    state.backendConnected = true;

    // Calculate validity duration for notification
    let validityText = '';
    if (state.tokenExpires) {
      const validityHours = ((state.tokenExpires - Date.now()) / (1000 * 60 * 60)).toFixed(1);
      validityText = ` (valid for ${validityHours}h)`;
    }

    // Show notification
    showNotification(
      isUpdate ? '🔄 Token Updated' : '✅ Token Captured',
      isUpdate
        ? `Whisk token automatically refreshed${validityText}`
        : `New Whisk token captured${validityText}`
    );

    console.log(`[Whisk Manager] ✅ Token ${isUpdate ? 'updated' : 'captured'} at ${new Date().toLocaleTimeString()}`);
  } else {
    state.backendConnected = false;
    await logError('Failed to send token to backend (is it running?)');
  }

  // Notify popup if it's open
  try {
    chrome.runtime.sendMessage({
      action: 'tokenUpdated',
      token: `${token.substring(0, 15)}...`,
      expires: state.tokenExpires
    });
  } catch (e) {
    // Popup not open, that's fine
  }

  // Update badge
  chrome.action.setBadgeText({ text: '✓' });
  chrome.action.setBadgeBackgroundColor({ color: '#00ff88' });

  // Clear badge after 3 seconds
  setTimeout(() => {
    chrome.action.setBadgeText({ text: '' });
  }, 3000);
}

/**
 * Send token to backend
 */
async function sendTokenToBackend(token, isRestore = false, expiresISO = null) {
  try {
    const response = await fetch(`${CONFIG.BACKEND_URL}${CONFIG.API_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: token,
        timestamp: Date.now(),
        isRestore: isRestore,
        expires: expiresISO,  // Include expiration info for backend
      }),
    });

    if (response.ok) {
      console.log(`[Whisk Manager] ✅ Token sent to backend ${isRestore ? '(restored)' : ''}`);
      return true;
    } else {
      console.error('[Whisk Manager] ❌ Backend returned error:', response.status);
      return false;
    }
  } catch (error) {
    console.error('[Whisk Manager] ❌ Failed to send token:', error.message);
    // Backend might not be running - that's OK, we'll try next time
    return false;
  }
}

/**
 * Refresh token by opening Whisk in background
 * SIMPLIFIED: No content script automation needed!
 * The auth session endpoint is called automatically on page load.
 */
async function refreshToken(isManualRefresh = false) {
  if (state.isRefreshing) {
    console.log('[Whisk Manager] ⏳ Refresh already in progress...');
    return;
  }

  const timeSinceLastToken = Date.now() - state.lastTokenTime;
  const tokenAgeHours = (timeSinceLastToken / (1000 * 60 * 60)).toFixed(1);

  console.log(`[Whisk Manager] Token age: ${tokenAgeHours} hours`);

  // Check if token needs refresh
  if (!isManualRefresh && timeSinceLastToken < CONFIG.TOKEN_REFRESH_INTERVAL) {
    const nextRefreshHours = ((CONFIG.TOKEN_REFRESH_INTERVAL - timeSinceLastToken) / (1000 * 60 * 60)).toFixed(1);
    console.log('[Whisk Manager] ⏭️  Token still fresh, skipping auto-refresh');
    console.log(`   Next auto-refresh in ${nextRefreshHours} hours`);
    return;
  }

  // Check if token is expired based on expiration timestamp
  if (state.tokenExpires && state.tokenExpires < Date.now()) {
    console.warn('[Whisk Manager] ⚠️  Token is EXPIRED!');
  }

  state.isRefreshing = true;

  try {
    console.log('[Whisk Manager] 🔄 Refreshing token...');
    console.log('   Opening Whisk in background tab...');

    // Store the token before refresh to check if it changed
    const tokenBefore = state.lastToken;

    // Open Whisk in background tab
    // The auth session endpoint will be called automatically on page load
    const tab = await chrome.tabs.create({
      url: CONFIG.WHISK_URL,
      active: false,  // Background tab
    });

    console.log(`   Opened tab ${tab.id}, waiting for auth session...`);

    // Wait 5 seconds for page to load and auth session to complete
    // Our onCompleted listener will automatically capture the token
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Close the tab
    try {
      await chrome.tabs.remove(tab.id);
      console.log('   Background tab closed');
    } catch (e) {
      console.warn('   Failed to close tab (may already be closed):', e.message);
    }

    // Check if token was updated
    if (state.lastToken !== tokenBefore) {
      console.log('[Whisk Manager] ✅ Token refresh complete - NEW TOKEN CAPTURED!');
      console.log(`   Token preview: ${state.lastToken.substring(0, 20)}...`);
    } else {
      console.warn('[Whisk Manager] ⚠️  Token refresh complete but NO NEW TOKEN captured');
      console.warn('   This might mean the page did not load properly or you are not logged in');
      await logError('Token refresh did not capture a new token - check if you are logged into Whisk');
    }
  } catch (error) {
    console.error('[Whisk Manager] ❌ Token refresh failed:', error.message);
    await logError(`Token refresh failed: ${error.message}`);
  } finally {
    state.isRefreshing = false;
  }
}

/**
 * Handle messages from popup AND content scripts
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getStatus') {
    sendResponse({
      hasToken: !!state.lastToken,
      lastUpdate: state.lastTokenTime,
      tokenExpires: state.tokenExpires,
      token: state.lastToken, // Send full token to popup
      backendConnected: state.backendConnected,
      errorCount: state.errorLog.length,
    });
  } else if (message.action === 'refreshNow') {
    console.log('[Whisk Manager] 🔄 Manual refresh requested from popup');
    refreshToken(true).then(() => {
      sendResponse({ success: true });
    }).catch((error) => {
      logError(`Manual refresh failed: ${error.message}`);
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep channel open for async response
  } else if (message.action === 'getErrors') {
    sendResponse({ errors: state.errorLog });
  } else if (message.action === 'clearErrors') {
    state.errorLog = [];
    chrome.storage.local.set({ errorLog: [] });
    sendResponse({ success: true });
  } else if (message.action === 'contentScriptLoaded') {
    console.log('[Whisk Manager] 📄 Content script loaded on:', message.url);
  } else if (message.action === 'contentScriptLog') {
    // Forward content script logs to service worker console
    console.log(`[Content Script] ${message.message}`);
  } else if (message.action === 'autoGenerateSuccess') {
    console.log('[Whisk Manager] ✅ Content script successfully triggered test image generation');
    console.log(`   Test prompt: "${message.prompt}"`);
    console.log(`   Method: ${message.method || 'UI automation'}`);
    console.log('   Waiting for Whisk API call to capture token...');
  } else if (message.action === 'autoGenerateError') {
    console.error('[Whisk Manager] ❌ Content script failed to auto-generate:', message.error);
    logError(`Auto-generate failed: ${message.error}`);
  } else if (message.action === 'contentScriptComplete') {
    console.log('[Whisk Manager] 📋 Content script completed (will be handled by promise)');
  }
});

/**
 * Handle messages from backend (error-triggered refresh)
 * When backend gets 401/400 from Whisk API, it can trigger an immediate refresh
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'tokenInvalid' || message.action === 'refreshTokenNow') {
    console.log('[Whisk Manager] 🚨 Backend detected invalid token (401/400 error)');
    console.log('[Whisk Manager] 🔄 Triggering immediate token refresh...');

    // Force refresh even if token seems fresh
    refreshToken(true).then(() => {
      sendResponse({
        success: !!state.lastToken,
        token: state.lastToken,
        expires: state.tokenExpires
      });
    }).catch((error) => {
      console.error('[Whisk Manager] ❌ Emergency refresh failed:', error);
      sendResponse({
        success: false,
        error: error.message
      });
    });

    return true;  // Keep channel open for async response
  }
});

/**
 * Handle external messages (for compatibility with older backend code)
 */
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (message.action === 'refreshToken') {
    console.log('[Whisk Manager] 🔄 External request for token refresh');
    refreshToken(true).then(() => {
      sendResponse({ success: true, token: state.lastToken });
    });
    return true;
  }
});

console.log('[Whisk Manager] 🎯 Background service worker started');
console.log('[Whisk Manager] 📡 Listening for Whisk API requests...');

/**
 * Whisk Token Manager - Background Service Worker
 *
 * Monitors requests to Whisk API and captures OAuth bearer tokens
 * Automatically POSTs captured tokens to local backend
 */

const BACKEND_URL = 'http://localhost:8347';
const WHISK_API_PATTERN = '*://aisandbox-pa.googleapis.com/*';

console.log('[Whisk Token Manager] Extension loaded');

// Listen for requests to Whisk API
chrome.webRequest.onBeforeSendHeaders.addListener(
  function(details) {
    // Look for Authorization header with Bearer token
    const authHeader = details.requestHeaders?.find(
      h => h.name.toLowerCase() === 'authorization'
    );

    if (authHeader && authHeader.value) {
      const match = authHeader.value.match(/^Bearer\s+(.+)$/i);
      if (match) {
        const token = match[1];

        // Check if this is a new token (different from last saved)
        chrome.storage.local.get(['lastToken'], function(result) {
          if (result.lastToken !== token) {
            console.log('[Whisk Token Manager] New token detected!');
            console.log(`   Token preview: ${token.substring(0, 20)}...`);

            // Save token locally
            chrome.storage.local.set({ lastToken: token, lastUpdate: Date.now() });

            // POST token to backend
            fetch(`${BACKEND_URL}/api/whisk/token`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                token: token,
                timestamp: Date.now(),
              }),
            })
              .then(response => response.json())
              .then(data => {
                console.log('[Whisk Token Manager] Token sent to backend successfully!');
                console.log('   Response:', data);
              })
              .catch(error => {
                console.error('[Whisk Token Manager] Failed to send token to backend:', error);
                console.error('   Is the backend running at', BACKEND_URL, '?');
              });
          }
        });
      }
    }

    return { requestHeaders: details.requestHeaders };
  },
  { urls: [WHISK_API_PATTERN] },
  ['requestHeaders']
);

console.log('[Whisk Token Manager] Monitoring Whisk API requests...');

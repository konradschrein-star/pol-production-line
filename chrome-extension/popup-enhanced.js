/**
 * Enhanced Popup Script - Production Ready
 * Full token display, error logging, notifications, auto-connection
 */

let state = {
  token: null,
  lastUpdate: null,
  backendConnected: false,
  errors: [],
  masked: true,
};

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Popup] Initializing...');

  // Load status from background
  await updateStatus();

  // Set up event listeners
  setupEventListeners();

  // Auto-refresh status every 5 seconds
  setInterval(updateStatus, 5000);
});

/**
 * Update popup status from background script
 */
async function updateStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getStatus' });

    if (response) {
      state.token = response.token;
      state.lastUpdate = response.lastUpdate;
      state.backendConnected = response.backendConnected || false;

      updateUI();
    }

    // Load error log
    const errorData = await chrome.storage.local.get(['errorLog']);
    if (errorData.errorLog) {
      state.errors = errorData.errorLog.slice(-10); // Last 10 errors
      updateErrorLog();
    }

  } catch (error) {
    console.error('[Popup] Failed to get status:', error);
    showError('Failed to communicate with extension background');
  }
}

/**
 * Update UI with current state
 */
function updateUI() {
  const indicator = document.getElementById('indicator');
  const statusText = document.getElementById('status-text');
  const statusTime = document.getElementById('status-time');
  const tokenDisplay = document.getElementById('token-display');
  const backendStatus = document.getElementById('backend-status');
  const refreshStatus = document.getElementById('refresh-status');

  // Status indicator
  if (state.token) {
    indicator.className = 'status-indicator active';
    statusText.textContent = 'Token Active';
    statusText.style.color = '#00ff88';

    // Show token
    if (state.masked) {
      tokenDisplay.textContent = maskToken(state.token);
    } else {
      tokenDisplay.textContent = state.token || 'No token';
    }
    tokenDisplay.classList.toggle('masked', state.masked);

  } else {
    indicator.className = 'status-indicator inactive';
    statusText.textContent = 'No Token';
    statusText.style.color = '#ff4444';
    tokenDisplay.textContent = 'No token captured yet';
  }

  // Last update time
  if (state.lastUpdate) {
    const ago = Math.floor((Date.now() - state.lastUpdate) / 1000 / 60);
    statusTime.textContent = ago === 0 ? 'Just now' : `${ago}m ago`;
  } else {
    statusTime.textContent = 'Never';
  }

  // Backend connection
  backendStatus.textContent = state.backendConnected ? '✓ Connected' : '✗ Offline';
  backendStatus.className = state.backendConnected ? 'connection-value' : 'connection-value error';

  // Auto-refresh
  refreshStatus.textContent = '✓ Enabled';
  refreshStatus.className = 'connection-value';
}

/**
 * Mask token for security
 */
function maskToken(token) {
  if (!token) return 'No token';
  if (token.length < 30) return token;
  return `${token.substring(0, 20)}...${'●'.repeat(token.length - 40)}...${token.substring(token.length - 20)}`;
}

/**
 * Update error log display
 */
function updateErrorLog() {
  const errorLog = document.getElementById('error-log');

  if (state.errors.length === 0) {
    errorLog.innerHTML = '<div class="error-log-empty">✓ No errors logged</div>';
    return;
  }

  errorLog.innerHTML = state.errors.map(error => `
    <div class="error-item">
      <div class="error-time">${new Date(error.timestamp).toLocaleString()}</div>
      <div class="error-message">${error.message}</div>
    </div>
  `).join('');
}

/**
 * Show error notification
 */
function showError(message) {
  const error = {
    timestamp: Date.now(),
    message: message,
  };

  state.errors.unshift(error);
  if (state.errors.length > 10) state.errors = state.errors.slice(0, 10);

  // Save to storage
  chrome.storage.local.set({ errorLog: state.errors });

  updateErrorLog();
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Copy token
  document.getElementById('copy-btn').addEventListener('click', async () => {
    if (!state.token) {
      alert('No token to copy');
      return;
    }

    try {
      await navigator.clipboard.writeText(state.token);
      const btn = document.getElementById('copy-btn');
      btn.textContent = '✓ Copied';
      btn.classList.add('copied');

      setTimeout(() => {
        btn.textContent = 'Copy';
        btn.classList.remove('copied');
      }, 2000);
    } catch (error) {
      showError('Failed to copy token to clipboard');
    }
  });

  // Toggle mask
  document.getElementById('toggle-mask').addEventListener('click', () => {
    state.masked = !state.masked;
    updateUI();
  });

  // Refresh token
  document.getElementById('refresh-btn').addEventListener('click', async () => {
    const btn = document.getElementById('refresh-btn');
    btn.disabled = true;
    btn.textContent = '⏳ Refreshing...';

    try {
      await chrome.runtime.sendMessage({ action: 'refreshNow' });

      // Wait a bit then update status
      setTimeout(async () => {
        await updateStatus();
        btn.textContent = '✓ Refreshed';

        setTimeout(() => {
          btn.textContent = '🔄 Refresh Now';
          btn.disabled = false;
        }, 2000);
      }, 3000);

    } catch (error) {
      showError('Failed to refresh token');
      btn.textContent = '✗ Failed';
      setTimeout(() => {
        btn.textContent = '🔄 Refresh Now';
        btn.disabled = false;
      }, 2000);
    }
  });

  // Test backend
  document.getElementById('test-backend').addEventListener('click', async () => {
    const btn = document.getElementById('test-backend');
    btn.disabled = true;
    btn.textContent = '⏳ Testing...';

    try {
      const response = await fetch('http://localhost:8347/api/whisk/extension-status');
      const data = await response.json();

      state.backendConnected = response.ok;

      if (response.ok) {
        btn.textContent = '✓ Connected';
        btn.style.background = '#00ff88';
        btn.style.color = '#000';
      } else {
        btn.textContent = '✗ Failed';
        btn.style.background = '#ff4444';
        btn.style.color = '#fff';
        showError('Backend responded with error: ' + response.status);
      }

      updateUI();

      setTimeout(() => {
        btn.textContent = '🔗 Test Backend';
        btn.style.background = '';
        btn.style.color = '';
        btn.disabled = false;
      }, 3000);

    } catch (error) {
      state.backendConnected = false;
      btn.textContent = '✗ Offline';
      btn.style.background = '#ff4444';
      btn.style.color = '#fff';
      showError('Backend not reachable at localhost:8347');

      updateUI();

      setTimeout(() => {
        btn.textContent = '🔗 Test Backend';
        btn.style.background = '';
        btn.style.color = '';
        btn.disabled = false;
      }, 3000);
    }
  });

  // Clear errors
  document.getElementById('clear-errors').addEventListener('click', () => {
    state.errors = [];
    chrome.storage.local.set({ errorLog: [] });
    updateErrorLog();
  });

  // Open dashboard
  document.getElementById('open-dashboard').addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:8347' });
  });

  // Show logs (opens service worker console)
  document.getElementById('show-logs').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
}

// Listen for token updates from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'tokenUpdated') {
    console.log('[Popup] Token updated notification received');
    updateStatus();
  }
});

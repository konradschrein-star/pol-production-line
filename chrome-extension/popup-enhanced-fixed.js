/**
 * Enhanced Popup Script - FIXED VERSION with Better Error Handling
 */

let state = {
  token: null,
  lastUpdate: null,
  backendConnected: false,
  errors: [],
  masked: true,
  extensionWorks: false,
};

// Debug logger
function debug(message, data) {
  console.log(`[Popup] ${message}`, data || '');
  updateDebugInfo();
}

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  debug('Popup loaded, initializing...');

  try {
    // Test extension APIs
    if (!chrome || !chrome.runtime) {
      throw new Error('Chrome runtime not available');
    }

    debug('Chrome APIs available');

    // Load status from background
    await updateStatus();

    // Set up event listeners
    setupEventListeners();

    // Auto-refresh status every 5 seconds
    setInterval(updateStatus, 5000);

    state.extensionWorks = true;
    debug('Extension initialized successfully');

  } catch (error) {
    debug('FATAL ERROR during initialization', error);
    showError(`Extension failed to initialize: ${error.message}`);
    document.getElementById('status-text').textContent = 'Extension Error';
    document.getElementById('status-text').style.color = '#ff4444';
  }
});

/**
 * Update debug info display
 */
function updateDebugInfo() {
  const debugDiv = document.getElementById('debug-info');
  if (!debugDiv) return;

  const info = [];
  info.push(`Extension: ${state.extensionWorks ? 'OK' : 'ERROR'}`);
  info.push(`Background: ${state.token ? 'Connected' : 'No Response'}`);
  info.push(`Backend: ${state.backendConnected ? 'Connected' : 'Offline'}`);
  info.push(`Errors: ${state.errors.length}`);

  debugDiv.innerHTML = info.join('<br>');
}

/**
 * Update popup status from background script
 */
async function updateStatus() {
  try {
    debug('Requesting status from background...');

    const response = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Background script timeout (5s)'));
      }, 5000);

      chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
        clearTimeout(timeout);

        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (!response) {
          reject(new Error('Background script returned null'));
        } else {
          resolve(response);
        }
      });
    });

    debug('Status received', response);

    state.token = response.token;
    state.lastUpdate = response.lastUpdate;
    state.backendConnected = response.backendConnected || false;

    updateUI();

    // Load error log
    const errorData = await chrome.storage.local.get(['errorLog']);
    if (errorData.errorLog) {
      state.errors = errorData.errorLog.slice(-10);
      updateErrorLog();
    }

  } catch (error) {
    debug('Failed to get status', error);
    showError(`Background communication failed: ${error.message}`);

    // Show error state in UI
    document.getElementById('status-text').textContent = 'Connection Error';
    document.getElementById('status-text').style.color = '#ff4444';
    document.getElementById('token-display').textContent = `Error: ${error.message}`;
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
    tokenDisplay.textContent = 'No token captured yet. Visit https://labs.google.com/whisk to generate one.';
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
  backendStatus.className = state.backendConnected ? 'info-value' : 'info-value';
  backendStatus.style.color = state.backendConnected ? '#00ff88' : '#ff4444';

  // Auto-refresh
  refreshStatus.textContent = '✓ Enabled (50min)';
  refreshStatus.style.color = '#00ff88';

  updateDebugInfo();
}

/**
 * Mask token for security
 */
function maskToken(token) {
  if (!token) return 'No token';
  if (token.length < 30) return token;
  return `${token.substring(0, 20)}...${'●'.repeat(Math.min(20, token.length - 40))}...${token.substring(token.length - 20)}`;
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
  debug('ERROR:', message);

  const error = {
    timestamp: Date.now(),
    message: message,
  };

  state.errors.unshift(error);
  if (state.errors.length > 10) state.errors = state.errors.slice(0, 10);

  // Save to storage
  try {
    chrome.storage.local.set({ errorLog: state.errors });
  } catch (e) {
    console.error('Failed to save error log:', e);
  }

  updateErrorLog();
  updateDebugInfo();
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  debug('Setting up event listeners...');

  // Copy token
  document.getElementById('copy-btn').addEventListener('click', async () => {
    debug('Copy button clicked');

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

      debug('Token copied to clipboard');
    } catch (error) {
      debug('Copy failed', error);
      showError('Failed to copy token to clipboard');
    }
  });

  // Toggle mask
  document.getElementById('toggle-mask').addEventListener('click', () => {
    debug('Toggle mask clicked');
    state.masked = !state.masked;
    updateUI();
  });

  // Refresh token
  document.getElementById('refresh-btn').addEventListener('click', async () => {
    debug('Refresh button clicked');
    const btn = document.getElementById('refresh-btn');
    btn.disabled = true;
    btn.textContent = '⏳ Refreshing...';

    try {
      const response = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Refresh timeout (30s)'));
        }, 30000);

        chrome.runtime.sendMessage({ action: 'refreshNow' }, (response) => {
          clearTimeout(timeout);

          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });

      debug('Refresh response', response);

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
      debug('Refresh failed', error);
      showError(`Failed to refresh token: ${error.message}`);
      btn.textContent = '✗ Failed';
      setTimeout(() => {
        btn.textContent = '🔄 Refresh Now';
        btn.disabled = false;
      }, 2000);
    }
  });

  // Test backend
  document.getElementById('test-backend').addEventListener('click', async () => {
    debug('Test backend clicked');
    const btn = document.getElementById('test-backend');
    btn.disabled = true;
    btn.textContent = '⏳ Testing...';

    try {
      const response = await fetch('http://localhost:8347/api/whisk/extension-status');
      const data = await response.json();

      debug('Backend response', data);

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
      debug('Backend test failed', error);
      state.backendConnected = false;
      btn.textContent = '✗ Offline';
      btn.style.background = '#ff4444';
      btn.style.color = '#fff';
      showError(`Backend not reachable: ${error.message}`);

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
    debug('Clear errors clicked');
    state.errors = [];
    chrome.storage.local.set({ errorLog: [] });
    updateErrorLog();
    updateDebugInfo();
  });

  // Open dashboard
  document.getElementById('open-dashboard').addEventListener('click', () => {
    debug('Open dashboard clicked');
    chrome.tabs.create({ url: 'http://localhost:8347' });
  });

  // Show background console (opens service worker inspector)
  document.getElementById('show-background').addEventListener('click', (e) => {
    e.preventDefault();
    debug('Show background clicked');

    // Open chrome://extensions and service worker inspector
    alert('To view background logs:\n\n1. Go to chrome://extensions/\n2. Find "Whisk Token Manager"\n3. Click "service worker" link\n4. Check the console for logs');
  });

  debug('Event listeners set up successfully');
}

// Listen for token updates from background
chrome.runtime.onMessage.addListener((message) => {
  debug('Message received from background', message);

  if (message.action === 'tokenUpdated') {
    debug('Token updated notification received');
    updateStatus();
  }
});

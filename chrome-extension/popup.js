/**
 * Popup UI Controller for Whisk Token Manager
 */

const elements = {
  indicator: document.getElementById('indicator'),
  statusText: document.getElementById('status-text'),
  statusTime: document.getElementById('status-time'),
  tokenPreview: document.getElementById('token-preview'),
  connectionStatus: document.getElementById('connection-status'),
  refreshBtn: document.getElementById('refresh-btn'),
};

let refreshing = false;

/**
 * Update UI with current status
 */
async function updateStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getStatus' });

    if (response.hasToken) {
      const timeSince = Date.now() - (response.lastUpdate || 0);
      const minutesAgo = Math.floor(timeSince / 60000);
      const hoursAgo = Math.floor(minutesAgo / 60);

      // Update indicator
      elements.indicator.className = 'status-indicator active';
      elements.statusText.textContent = 'Token Active';

      // Update time
      if (minutesAgo === 0) {
        elements.statusTime.textContent = 'Just now';
      } else if (minutesAgo < 60) {
        elements.statusTime.textContent = `${minutesAgo}m ago`;
      } else {
        elements.statusTime.textContent = `${hoursAgo}h ago`;
      }

      // Update token preview
      elements.tokenPreview.textContent = response.token || 'Token available';

      // Connection status
      elements.connectionStatus.textContent = '✓ ACTIVE';
      elements.connectionStatus.style.color = '#00ff88';
    } else {
      // No token
      elements.indicator.className = 'status-indicator inactive';
      elements.statusText.textContent = 'No Token';
      elements.statusTime.textContent = '-';
      elements.tokenPreview.textContent = 'Visit labs.google/fx/tools/whisk to capture token';
      elements.connectionStatus.textContent = '○ WAITING';
      elements.connectionStatus.style.color = '#ff4444';
    }
  } catch (error) {
    console.error('Failed to get status:', error);
  }
}

/**
 * Handle refresh button click
 */
elements.refreshBtn.addEventListener('click', async () => {
  if (refreshing) return;

  refreshing = true;
  elements.refreshBtn.disabled = true;
  elements.refreshBtn.textContent = 'Refreshing...';

  try {
    await chrome.runtime.sendMessage({ action: 'refreshNow' });

    // Wait 3 seconds then check status
    setTimeout(async () => {
      await updateStatus();
      refreshing = false;
      elements.refreshBtn.disabled = false;
      elements.refreshBtn.textContent = 'Refresh Token Now';
    }, 3000);
  } catch (error) {
    console.error('Refresh failed:', error);
    refreshing = false;
    elements.refreshBtn.disabled = false;
    elements.refreshBtn.textContent = 'Refresh Token Now';
  }
});

// Initial update
updateStatus();

// Update every 2 seconds while popup is open
setInterval(updateStatus, 2000);

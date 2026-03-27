/**
 * Whisk Automator - Content Script
 * Fully autonomous token refresh by generating test images
 */

// Helper to log both to console and send to background
function log(message, data) {
  const fullMessage = data ? `${message} ${JSON.stringify(data)}` : message;
  console.log(`[Whisk Automator] ${fullMessage}`);

  // Also send to background so it appears in service worker console
  try {
    chrome.runtime.sendMessage({
      action: 'contentScriptLog',
      message: fullMessage,
    });
  } catch (e) {
    // Background might be gone, ignore
  }
}

(async () => {
  try {
    log('========================================');
    log('Content script starting...');
    log('URL:', window.location.href);
    log('Document state:', document.readyState);
    log('Timestamp:', new Date().toISOString());
    log('========================================');

    // Notify background that content script has loaded
    chrome.runtime.sendMessage({
      action: 'contentScriptLoaded',
      url: window.location.href
    });

    // Use promises instead of callbacks for storage
    log('Checking storage for auto-refresh flag...');
    const data = await chrome.storage.local.get(['isAutoRefresh', 'refreshTabId']);

    log('Storage data:', data);
    log('isAutoRefresh:', data.isAutoRefresh);
    log('refreshTabId:', data.refreshTabId);

    if (!data.isAutoRefresh) {
      log('Not in auto-refresh mode - exiting');
      return;
    }

    log('🤖 AUTO-REFRESH MODE ACTIVATED!');
    log('========================================');

    const tabId = data.refreshTabId;

    // Clear the flags immediately
    await chrome.storage.local.set({ isAutoRefresh: false, refreshTabId: null });
    log('Cleared auto-refresh flags');

    // Wait for page to be fully ready
    if (document.readyState !== 'complete') {
      log('Waiting for page load...');
      await new Promise(resolve => window.addEventListener('load', resolve));
      log('Page loaded!');
    }

    // Wait for app to initialize (React/Vue/etc)
    log('Waiting 6 seconds for app initialization...');
    await new Promise(resolve => setTimeout(resolve, 6000));

    // Wait for input field to appear (try multiple times)
    log('Searching for input field (will retry if needed)...');
    let inputFound = false;
    for (let i = 0; i < 5; i++) {
      const inputs = document.querySelectorAll('input:not([type="hidden"]), textarea:not([id*="recaptcha"]), [contenteditable="true"]');
      for (const input of inputs) {
        const rect = input.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          inputFound = true;
          log(`Found visible input on attempt ${i + 1}`);
          break;
        }
      }
      if (inputFound) break;

      log(`Attempt ${i + 1}/5: No visible input yet, waiting 2s...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    log('========================================');
    log('STARTING IMAGE GENERATION');
    log('========================================');

    // Try to generate image
    const generated = await attemptAutoGenerate();

    if (generated) {
      log('✅ Image generation initiated successfully!');
      log('Waiting 10 seconds for API call to complete...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    } else {
      log('WARN: ⚠️  Image generation may have failed');
    }

    log('========================================');
    log('AUTO-REFRESH SEQUENCE COMPLETE');
    log('========================================');

    // Notify background we're done
    chrome.runtime.sendMessage({
      action: 'contentScriptComplete',
      tabId: tabId,
      success: generated,
    });

  } catch (error) {
    log('ERROR: ❌ FATAL ERROR:', error);
    log('ERROR: Error stack:', error.stack);

    chrome.runtime.sendMessage({
      action: 'autoGenerateError',
      error: `Fatal error: ${error.message}`,
    });

    chrome.runtime.sendMessage({
      action: 'contentScriptComplete',
      tabId: null,
      success: false,
    });
  }
})();

/**
 * Attempt to automatically generate an image
 */
async function attemptAutoGenerate() {
  log('=== ATTEMPTING AUTO-GENERATE ===');

  try {
    // First, try direct API call (most reliable)
    log('Strategy: Direct API call');
    const apiSuccess = await attemptDirectAPICall();

    if (apiSuccess) {
      return true;
    }

    // Fallback: Try UI automation
    log('Direct API failed, trying UI automation...');
    return await attemptUIAutomation();

  } catch (error) {
    log('ERROR: Auto-generate error:', error);
    return false;
  }
}

/**
 * Direct API call - uses UI automation to trigger page's own request
 * This way the page's authentication is used
 */
async function attemptDirectAPICall() {
  log('Attempting to trigger UI-based image generation...');

  // Since direct fetch gets 401, we need to use the page's own mechanisms
  // Let's try to find and click the generate button
  return await attemptUIAutomation();
}

/**
 * UI automation - find and click elements to trigger image generation
 */
async function attemptUIAutomation() {
  log('=== UI AUTOMATION ATTEMPT ===');

  try {
    // Find all inputs and buttons (exclude reCAPTCHA and hidden fields)
    const inputs = document.querySelectorAll('input:not([type="hidden"]):not([id*="recaptcha"]), textarea:not([id*="recaptcha"]):not([id*="g-recaptcha"]), [contenteditable="true"]');
    const buttons = document.querySelectorAll('button, [role="button"]');

    log(`Found ${inputs.length} inputs and ${buttons.length} buttons`);

    // Find a visible text input
    let targetInput = null;
    for (const input of inputs) {
      // Skip reCAPTCHA
      if (input.id && (input.id.includes('recaptcha') || input.id.includes('g-recaptcha'))) {
        continue;
      }

      const rect = input.getBoundingClientRect();
      const style = window.getComputedStyle(input);
      const isVisible = rect.width > 0 && rect.height > 0 &&
                       style.display !== 'none' &&
                       style.visibility !== 'hidden' &&
                       style.opacity !== '0';

      if (isVisible) {
        targetInput = input;
        log(`Found visible input: ${input.tagName} id="${input.id}" class="${input.className.substring(0, 50)}"`);
        break;
      }
    }

    if (!targetInput) {
      log('ERROR: No visible input found after filtering!');

      // List all inputs found (before filtering)
      const allInputs = document.querySelectorAll('*');
      let inputCount = 0;
      log('Searching ALL elements for potential inputs...');

      for (const el of allInputs) {
        // Check if it looks like an input
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' ||
            el.contentEditable === 'true' ||
            el.getAttribute('role') === 'textbox') {

          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);

          log(`  Potential input ${inputCount++}: ${el.tagName} id="${el.id || 'none'}" ` +
              `visible=${rect.width}x${rect.height} display=${style.display} ` +
              `placeholder="${el.placeholder || 'none'}"`);

          // If we find ANY potentially usable input, try it
          if (rect.width > 0 && rect.height > 0 &&
              style.display !== 'none' &&
              !el.id?.includes('recaptcha')) {
            targetInput = el;
            log(`  ✅ Using this input as fallback`);
            break;
          }
        }

        if (inputCount > 20) break; // Don't spam logs
      }

      if (!targetInput) {
        log('ERROR: Still no input found after exhaustive search!');
        return false;
      }
    }

    // Fill in the input with test prompt
    log('Filling input with test prompt...');
    targetInput.focus();

    // Try multiple methods to set value
    targetInput.value = 'abstract pattern';
    targetInput.dispatchEvent(new Event('input', { bubbles: true }));
    targetInput.dispatchEvent(new Event('change', { bubbles: true }));

    // For contenteditable
    if (targetInput.contentEditable === 'true') {
      targetInput.textContent = 'abstract pattern';
      targetInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    log('Input filled with: "abstract pattern"');

    // Wait a moment for UI to update
    await new Promise(resolve => setTimeout(resolve, 500));

    // Find the generate button
    const buttonKeywords = ['generate', 'create', 'remix', 'submit', 'go', 'make', 'start'];
    let targetButton = null;

    for (const button of buttons) {
      const rect = button.getBoundingClientRect();
      const isVisible = rect.width > 0 && rect.height > 0 &&
                       window.getComputedStyle(button).display !== 'none' &&
                       window.getComputedStyle(button).visibility !== 'hidden' &&
                       !button.disabled;

      if (!isVisible) continue;

      const text = (button.textContent || '').toLowerCase();
      const aria = (button.getAttribute('aria-label') || '').toLowerCase();
      const fullText = text + ' ' + aria;

      for (const keyword of buttonKeywords) {
        if (fullText.includes(keyword)) {
          targetButton = button;
          log(`Found button with keyword "${keyword}": "${button.textContent?.trim() || aria}"`);
          break;
        }
      }

      if (targetButton) break;
    }

    if (!targetButton) {
      log('ERROR: No generate button found!');
      // List visible buttons for debugging
      let visibleCount = 0;
      buttons.forEach((btn, i) => {
        const rect = btn.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          visibleCount++;
          log(`  Button ${i}: "${btn.textContent?.trim().substring(0, 30)}" disabled=${btn.disabled}`);
        }
      });
      log(`Total visible buttons: ${visibleCount}`);
      return false;
    }

    // Click the button!
    log('Clicking generate button...');
    targetButton.click();
    log('✅ Button clicked!');

    chrome.runtime.sendMessage({
      action: 'autoGenerateSuccess',
      prompt: 'abstract pattern',
      method: 'ui_automation',
    });

    return true;

  } catch (error) {
    log('ERROR: UI automation exception:', error);
    return false;
  }
}

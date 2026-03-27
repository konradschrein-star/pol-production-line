/**
 * Chrome Extension Validation Script
 *
 * Simple test script to verify the Whisk Token Manager Chrome extension
 * is properly packaged before building the installer.
 *
 * Part of Phase 2, Task 2.3: Chrome Extension Packaging
 *
 * Usage: npm run test:extension
 */

import * as path from 'path';
import * as fs from 'fs';

// Import helper functions (adjust path for script execution context)
import {
  checkExtension,
  getExtensionPath,
  validateExtensionFiles,
  isChromeInstalled,
  type ExtensionInfo
} from '../electron/src/installer/extension-installer';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m'
};

/**
 * Print colored status line
 */
function printStatus(status: 'pass' | 'fail' | 'warn' | 'info', message: string) {
  const symbols = {
    pass: '✓',
    fail: '✗',
    warn: '⚠',
    info: 'ℹ'
  };

  const statusColors = {
    pass: colors.green,
    fail: colors.red,
    warn: colors.yellow,
    info: colors.blue
  };

  const symbol = symbols[status];
  const color = statusColors[status];

  console.log(`${color}${symbol} ${message}${colors.reset}`);
}

/**
 * Print section header
 */
function printHeader(title: string) {
  console.log(`\n${colors.bold}${colors.blue}=== ${title} ===${colors.reset}\n`);
}

/**
 * Main validation function
 */
async function validateExtension(): Promise<boolean> {
  let allTestsPassed = true;

  printHeader('Chrome Extension Validation');

  // Test 1: Extension directory exists
  const extensionPath = getExtensionPath();
  printStatus('info', `Checking extension at: ${extensionPath}`);

  if (!fs.existsSync(extensionPath)) {
    printStatus('fail', 'Extension directory does not exist');
    allTestsPassed = false;
    return allTestsPassed;
  }
  printStatus('pass', 'Extension directory exists');

  // Test 2: Check extension validity
  const extensionInfo: ExtensionInfo = checkExtension();

  if (!extensionInfo.exists) {
    printStatus('fail', 'Extension check failed: Directory not found');
    allTestsPassed = false;
    return allTestsPassed;
  }
  printStatus('pass', 'Extension exists');

  if (!extensionInfo.manifestValid) {
    printStatus('fail', `Manifest validation failed: ${extensionInfo.error || 'Unknown error'}`);
    allTestsPassed = false;
    return allTestsPassed;
  }
  printStatus('pass', 'Manifest.json is valid');

  // Test 3: Display manifest information
  if (extensionInfo.manifestData) {
    printStatus('info', `Extension Name: ${extensionInfo.manifestData.name}`);
    printStatus('info', `Version: ${extensionInfo.manifestData.version}`);
    printStatus('info', `Manifest Version: ${extensionInfo.manifestData.manifest_version}`);
  }

  // Test 4: File count validation
  if (extensionInfo.fileCount) {
    printStatus('info', `File Count: ${extensionInfo.fileCount}`);

    if (extensionInfo.fileCount < 15) {
      printStatus('warn', `File count is low (expected ~23). Some files may be missing.`);
      allTestsPassed = false;
    } else if (extensionInfo.fileCount < 20) {
      printStatus('warn', `File count is below expected (~23). Verify all files are present.`);
    } else {
      printStatus('pass', 'File count looks good');
    }
  }

  // Test 5: Validate critical files
  printHeader('Critical Files Validation');

  const fileValidation = validateExtensionFiles();

  if (fileValidation.valid) {
    printStatus('pass', 'All critical files present');
  } else {
    printStatus('fail', 'Some critical files are missing');
    allTestsPassed = false;
  }

  // Display present files
  if (fileValidation.presentFiles.length > 0) {
    printStatus('info', `Present files (${fileValidation.presentFiles.length}):`);
    fileValidation.presentFiles.forEach(file => {
      console.log(`  ${colors.green}✓${colors.reset} ${file}`);
    });
  }

  // Display missing files
  if (fileValidation.missingFiles.length > 0) {
    printStatus('warn', `Missing files (${fileValidation.missingFiles.length}):`);
    fileValidation.missingFiles.forEach(file => {
      console.log(`  ${colors.red}✗${colors.reset} ${file}`);
    });
  }

  // Test 6: Check for specific extension files
  printHeader('Extension Component Check');

  const componentFiles = {
    'Service Worker': 'background.js',
    'Popup HTML': 'popup-enhanced-fixed.html',
    'Popup Script': 'popup-enhanced-fixed.js',
    'Content Script': 'whisk-automator.js',
    'Icons': ['icon16.png', 'icon48.png', 'icon128.png']
  };

  for (const [component, files] of Object.entries(componentFiles)) {
    const fileList = Array.isArray(files) ? files : [files];
    const allPresent = fileList.every(file =>
      fs.existsSync(path.join(extensionPath, file))
    );

    if (allPresent) {
      printStatus('pass', `${component}: OK`);
    } else {
      printStatus('fail', `${component}: Missing`);
      allTestsPassed = false;
    }
  }

  // Test 7: Check Chrome installation (informational)
  printHeader('System Check');

  try {
    const chromeInstalled = await isChromeInstalled();
    if (chromeInstalled) {
      printStatus('pass', 'Google Chrome is installed on this system');
    } else {
      printStatus('warn', 'Google Chrome not detected (extension can still be packaged)');
    }
  } catch (error) {
    printStatus('warn', `Could not check Chrome installation: ${error}`);
  }

  // Test 8: Verify manifest content
  printHeader('Manifest Content Verification');

  try {
    const manifestPath = path.join(extensionPath, 'manifest.json');
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);

    // Check required permissions
    const requiredPermissions = ['storage', 'tabs', 'webRequest'];
    const hasAllPermissions = requiredPermissions.every(perm =>
      manifest.permissions?.includes(perm)
    );

    if (hasAllPermissions) {
      printStatus('pass', 'Required permissions present');
    } else {
      printStatus('fail', 'Missing required permissions');
      allTestsPassed = false;
    }

    // Check host permissions
    if (manifest.host_permissions && manifest.host_permissions.length > 0) {
      printStatus('pass', `Host permissions configured (${manifest.host_permissions.length})`);
    } else {
      printStatus('warn', 'No host permissions found');
    }

    // Check background service worker
    if (manifest.background?.service_worker) {
      printStatus('pass', 'Background service worker configured');
    } else {
      printStatus('fail', 'Background service worker not configured');
      allTestsPassed = false;
    }

    // Check action (popup)
    if (manifest.action?.default_popup) {
      printStatus('pass', 'Extension popup configured');
    } else {
      printStatus('warn', 'Extension popup not configured');
    }

  } catch (error) {
    printStatus('fail', `Manifest verification failed: ${error}`);
    allTestsPassed = false;
  }

  return allTestsPassed;
}

/**
 * Main execution
 */
async function main() {
  console.log(`${colors.bold}Chrome Extension Validation Tool${colors.reset}`);
  console.log(`Part of Phase 2, Task 2.3: Chrome Extension Packaging\n`);

  try {
    const passed = await validateExtension();

    // Final result
    printHeader('Validation Result');

    if (passed) {
      printStatus('pass', 'All validation checks passed!');
      console.log(`\n${colors.green}${colors.bold}✓ Extension is ready for packaging${colors.reset}\n`);
      process.exit(0);
    } else {
      printStatus('fail', 'Some validation checks failed');
      console.log(`\n${colors.red}${colors.bold}✗ Extension has issues that need to be fixed${colors.reset}\n`);
      process.exit(1);
    }

  } catch (error) {
    console.error(`\n${colors.red}${colors.bold}Fatal Error:${colors.reset}`, error);
    process.exit(1);
  }
}

// Run validation
main();

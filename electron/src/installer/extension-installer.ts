/**
 * Chrome Extension Installer Helper
 *
 * Programmatic utilities for managing the Whisk Token Manager Chrome extension
 * during the Obsidian News Desk installation and setup process.
 *
 * The extension auto-refreshes Whisk API tokens every 50 minutes and stores them
 * for the main application to read. This eliminates manual token refresh.
 *
 * Part of Phase 2, Task 2.3: Chrome Extension Packaging
 */

import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Extension information returned by checkExtension()
 */
export interface ExtensionInfo {
  exists: boolean;
  path: string;
  manifestValid: boolean;
  manifestData?: {
    name: string;
    version: string;
    manifest_version: number;
  };
  fileCount?: number;
  error?: string;
}

/**
 * Get the path to the bundled Chrome extension
 *
 * @param appPath - Optional app path override (for testing)
 * @returns Absolute path to chrome-extension directory
 */
export function getExtensionPath(appPath?: string): string {
  if (process.env.NODE_ENV === 'development' || !appPath) {
    // Development: Use project root chrome-extension/ folder
    return path.join(process.cwd(), 'chrome-extension');
  }

  // Production: Extension is bundled in resources/chrome-extension/
  // In Electron, app.getAppPath() points to app.asar or unpacked directory
  // Resources are one level up from there
  const resourcesPath = path.join(appPath, '..', 'resources', 'chrome-extension');

  // Fallback: Check if resources is at app level (some build configurations)
  if (!fs.existsSync(resourcesPath)) {
    return path.join(appPath, 'resources', 'chrome-extension');
  }

  return resourcesPath;
}

/**
 * Check if the Chrome extension is properly packaged and valid
 *
 * Validates:
 * - Directory exists
 * - manifest.json exists and is valid JSON
 * - Required fields present in manifest
 * - Expected file count (~23 files)
 *
 * @param appPath - Optional app path override (for testing)
 * @returns Extension information object
 */
export function checkExtension(appPath?: string): ExtensionInfo {
  const extensionPath = getExtensionPath(appPath);

  // Check if directory exists
  if (!fs.existsSync(extensionPath)) {
    return {
      exists: false,
      path: extensionPath,
      manifestValid: false,
      error: 'Extension directory not found'
    };
  }

  // Check if manifest.json exists
  const manifestPath = path.join(extensionPath, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    return {
      exists: true,
      path: extensionPath,
      manifestValid: false,
      error: 'manifest.json not found'
    };
  }

  // Parse and validate manifest.json
  try {
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);

    // Validate required fields
    const requiredFields = ['name', 'version', 'manifest_version'];
    const missingFields = requiredFields.filter(field => !manifest[field]);

    if (missingFields.length > 0) {
      return {
        exists: true,
        path: extensionPath,
        manifestValid: false,
        error: `Missing required fields in manifest: ${missingFields.join(', ')}`
      };
    }

    // Verify manifest version is 3 (Chrome MV3)
    if (manifest.manifest_version !== 3) {
      return {
        exists: true,
        path: extensionPath,
        manifestValid: false,
        error: `Invalid manifest_version: ${manifest.manifest_version} (expected 3)`
      };
    }

    // Count files in extension directory
    const files = fs.readdirSync(extensionPath);
    const fileCount = files.length;

    // Expected: ~23 files (manifest, background.js, popup files, icons, etc.)
    if (fileCount < 15) {
      console.warn(`Warning: Extension has ${fileCount} files (expected ~23). Some files may be missing.`);
    }

    return {
      exists: true,
      path: extensionPath,
      manifestValid: true,
      manifestData: {
        name: manifest.name,
        version: manifest.version,
        manifest_version: manifest.manifest_version
      },
      fileCount
    };

  } catch (error) {
    return {
      exists: true,
      path: extensionPath,
      manifestValid: false,
      error: `Failed to parse manifest.json: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Open Chrome extensions page (chrome://extensions/) in the default browser
 *
 * Platform-specific implementations:
 * - Windows: Uses 'start' command
 * - macOS: Uses 'open' command
 * - Linux: Uses 'xdg-open' command
 *
 * @returns Promise that resolves when command executes
 */
export async function openChromeExtensions(): Promise<void> {
  const platform = process.platform;
  let command: string;

  switch (platform) {
    case 'win32':
      command = 'start chrome://extensions/';
      break;
    case 'darwin':
      command = 'open -a "Google Chrome" chrome://extensions/';
      break;
    case 'linux':
      command = 'xdg-open chrome://extensions/';
      break;
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }

  try {
    await execAsync(command);
  } catch (error) {
    throw new Error(`Failed to open Chrome extensions: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Check if Google Chrome is installed on the system
 *
 * Platform-specific detection:
 * - Windows: Checks registry keys and common install paths
 * - macOS: Checks /Applications/Google Chrome.app
 * - Linux: Checks for 'google-chrome' in PATH
 *
 * @returns Promise<boolean> indicating if Chrome is installed
 */
export async function isChromeInstalled(): Promise<boolean> {
  const platform = process.platform;

  try {
    switch (platform) {
      case 'win32':
        // Check Windows registry for Chrome installation
        try {
          await execAsync('reg query "HKEY_CURRENT_USER\\Software\\Google\\Chrome" /ve');
          return true;
        } catch {
          // Try local machine registry
          try {
            await execAsync('reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Google\\Chrome" /ve');
            return true;
          } catch {
            // Try common installation paths as fallback
            const commonPaths = [
              'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
              'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
              path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe')
            ];
            return commonPaths.some(p => fs.existsSync(p));
          }
        }

      case 'darwin':
        // Check macOS Applications folder
        return fs.existsSync('/Applications/Google Chrome.app');

      case 'linux':
        // Check if google-chrome is in PATH
        try {
          await execAsync('which google-chrome');
          return true;
        } catch {
          return false;
        }

      default:
        return false;
    }
  } catch (error) {
    console.error('Error checking Chrome installation:', error);
    return false;
  }
}

/**
 * Validate critical extension files exist
 *
 * Checks for required files:
 * - manifest.json (required)
 * - background.js (required for service worker)
 * - icon16.png, icon48.png, icon128.png (required for Chrome)
 * - popup files (popup-enhanced-fixed.html uses inline styles, popup-enhanced-fixed.js)
 * - content script (whisk-automator.js)
 *
 * @param extensionPath - Path to extension directory (optional, uses getExtensionPath if not provided)
 * @returns Object with validation results
 */
export function validateExtensionFiles(extensionPath?: string): {
  valid: boolean;
  missingFiles: string[];
  presentFiles: string[];
} {
  const extPath = extensionPath || getExtensionPath();

  const requiredFiles = [
    'manifest.json',
    'background.js',
    'icon16.png',
    'icon48.png',
    'icon128.png',
    'popup-enhanced-fixed.html',
    'popup-enhanced-fixed.js',
    'whisk-automator.js'
  ];

  const missingFiles: string[] = [];
  const presentFiles: string[] = [];

  for (const file of requiredFiles) {
    const filePath = path.join(extPath, file);
    if (fs.existsSync(filePath)) {
      presentFiles.push(file);
    } else {
      missingFiles.push(file);
    }
  }

  return {
    valid: missingFiles.length === 0,
    missingFiles,
    presentFiles
  };
}

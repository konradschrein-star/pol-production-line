// Auto-updater for checking and installing updates from GitHub Releases
// Events are now forwarded to React UI (see main.ts)

import { autoUpdater } from 'electron-updater';
import logger from './logger';

export interface UpdateInfo {
  version: string;
  releaseNotes?: string;
  releaseDate?: string;
}

/**
 * Initialize auto-updater
 */
export function initAutoUpdater(): void {
  // Configure auto-updater
  autoUpdater.autoDownload = false; // Don't auto-download, ask user first
  autoUpdater.autoInstallOnAppQuit = true;

  // Set up event handlers
  autoUpdater.on('checking-for-update', () => {
    logger.info('Checking for updates...', 'updater');
  });

  autoUpdater.on('update-available', (info) => {
    logger.info('Update available', 'updater', { version: info.version });
    // Event forwarded to React UI in main.ts
  });

  autoUpdater.on('update-not-available', (info) => {
    logger.info('No updates available', 'updater', { version: info.version });
  });

  autoUpdater.on('error', (error) => {
    logger.error('Update check failed', 'updater', { error: error.message });
  });

  autoUpdater.on('download-progress', (progress) => {
    const percent = Math.round(progress.percent);
    logger.info(`Downloading update: ${percent}%`, 'updater');
  });

  autoUpdater.on('update-downloaded', (info) => {
    logger.info('Update downloaded', 'updater', { version: info.version });
    // Event forwarded to React UI in main.ts
  });

  // Check for updates on startup (after a delay)
  setTimeout(() => {
    checkForUpdates();
  }, 5000);

  // Check every 6 hours
  setInterval(() => {
    checkForUpdates();
  }, 6 * 60 * 60 * 1000);
}

/**
 * Manually check for updates
 */
export async function checkForUpdates(): Promise<void> {
  try {
    await autoUpdater.checkForUpdates();
  } catch (error: any) {
    logger.error('Failed to check for updates', 'updater', { error: error.message });
  }
}

/**
 * Get current app version
 */
export function getCurrentVersion(): string {
  return autoUpdater.currentVersion.version;
}

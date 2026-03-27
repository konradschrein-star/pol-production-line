// Auto-updater for checking and installing updates from GitHub Releases

import { autoUpdater } from 'electron-updater';
import { dialog, shell } from 'electron';
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
    showUpdateAvailableDialog(info);
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
    showUpdateReadyDialog(info);
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
 * Show dialog when update is available
 */
function showUpdateAvailableDialog(info: any): void {
  const version = info.version;
  const releaseNotes = info.releaseNotes || 'No release notes available';

  dialog
    .showMessageBox({
      type: 'info',
      title: 'Update Available',
      message: `Version ${version} is available!`,
      detail: `Release Notes:\n${releaseNotes}\n\nWould you like to download this update now?`,
      buttons: ['Download Now', 'View on GitHub', 'Later'],
      defaultId: 0,
      cancelId: 2,
    })
    .then((result) => {
      if (result.response === 0) {
        // Download now
        logger.info('User chose to download update', 'updater');
        autoUpdater.downloadUpdate();
      } else if (result.response === 1) {
        // View on GitHub
        shell.openExternal(`https://github.com/konradschrein-star/pol-production-line/releases/tag/v${version}`);
      }
    });
}

/**
 * Show dialog when update is downloaded and ready to install
 */
function showUpdateReadyDialog(info: any): void {
  const version = info.version;

  dialog
    .showMessageBox({
      type: 'info',
      title: 'Update Ready',
      message: `Version ${version} has been downloaded`,
      detail: 'The update will be installed when you restart the application.\n\nWould you like to restart now?',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      cancelId: 1,
    })
    .then((result) => {
      if (result.response === 0) {
        // Restart now
        logger.info('User chose to restart and install update', 'updater');
        autoUpdater.quitAndInstall(false, true);
      }
    });
}

/**
 * Get current app version
 */
export function getCurrentVersion(): string {
  return autoUpdater.currentVersion.version;
}

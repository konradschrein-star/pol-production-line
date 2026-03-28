/**
 * Auto-Start Manager - Windows registry integration for startup on boot
 *
 * IMPORTANT: Windows-only in Phase 5
 * - Uses HKCU registry hive (no admin required)
 * - Supports --minimized flag for tray-only startup
 * - macOS/Linux support deferred to Phase 6+
 */

import { app, dialog } from 'electron';
import * as path from 'path';
import logger from './logger';

// Windows registry access
const Registry = require('winreg');

export interface AutoStartOptions {
  enabled: boolean;
  minimized?: boolean; // Start minimized to tray
}

export class AutoStartManager {
  private appName = 'Obsidian News Desk';
  private exePath = app.getPath('exe');

  /**
   * Enable auto-start on Windows boot
   * Adds registry entry: HKCU\Software\Microsoft\Windows\CurrentVersion\Run
   */
  async enable(options: AutoStartOptions = { enabled: true, minimized: false }): Promise<void> {
    if (process.platform !== 'win32') {
      const errorMsg = 'Auto-start is only supported on Windows in Phase 5';
      logger.warn(errorMsg, 'auto-start');
      await this.showErrorDialog('Auto-Start Not Supported', errorMsg);
      return;
    }

    try {
      const regKey = new Registry({
        hive: Registry.HKCU,
        key: '\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
      });

      // CRITICAL FIX: Proper quote escaping for paths with spaces
      // Use escaped quotes: \\"path\\" instead of "path"
      const execPath = options.minimized
        ? `\\"${this.exePath}\\" --minimized`
        : `\\"${this.exePath}\\"`;

      // Set registry value
      await new Promise<void>((resolve, reject) => {
        regKey.set(this.appName, Registry.REG_SZ, execPath, (err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });

      logger.info(`Auto-start enabled: ${execPath}`, 'auto-start');
    } catch (err: any) {
      const errorMsg = `Failed to enable auto-start: ${err.message}`;
      logger.error(errorMsg, 'auto-start');
      await this.showErrorDialog('Auto-Start Error', errorMsg);
      throw err;
    }
  }

  /**
   * Disable auto-start
   * Removes registry entry
   */
  async disable(): Promise<void> {
    if (process.platform !== 'win32') {
      return;
    }

    try {
      const regKey = new Registry({
        hive: Registry.HKCU,
        key: '\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
      });

      // Remove registry value
      await new Promise<void>((resolve, reject) => {
        regKey.remove(this.appName, (err: any) => {
          if (err) {
            // Ignore "value not found" errors (already removed)
            if (err.code === 2) resolve();
            else reject(err);
          } else {
            resolve();
          }
        });
      });

      logger.info('Auto-start disabled', 'auto-start');
    } catch (err: any) {
      const errorMsg = `Failed to disable auto-start: ${err.message}`;
      logger.error(errorMsg, 'auto-start');
      await this.showErrorDialog('Auto-Start Error', errorMsg);
      throw err;
    }
  }

  /**
   * Check if auto-start is currently enabled
   */
  async isEnabled(): Promise<boolean> {
    if (process.platform !== 'win32') {
      return false;
    }

    try {
      const regKey = new Registry({
        hive: Registry.HKCU,
        key: '\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
      });

      return new Promise<boolean>((resolve) => {
        regKey.get(this.appName, (err: any, item: any) => {
          if (err || !item) {
            resolve(false);
          } else {
            resolve(true);
          }
        });
      });
    } catch (err) {
      logger.error('Failed to check auto-start status', 'auto-start', { error: err });
      return false;
    }
  }

  /**
   * Toggle auto-start on/off
   */
  async toggle(enable: boolean, minimized: boolean = false): Promise<boolean> {
    if (enable) {
      await this.enable({ enabled: true, minimized });
      return true;
    } else {
      await this.disable();
      return false;
    }
  }

  /**
   * Show user-facing error dialog (better UX than console logs)
   */
  private async showErrorDialog(title: string, message: string): Promise<void> {
    try {
      await dialog.showMessageBox({
        type: 'error',
        title,
        message,
        buttons: ['OK'],
        detail: 'Check the logs for more details or contact support if this persists.',
      });
    } catch (err) {
      // Fallback if dialog fails (headless mode, etc.)
      logger.error(`Failed to show error dialog: ${err}`, 'auto-start');
    }
  }

  /**
   * Check if --minimized flag is present in process args
   * This is called by main.ts to determine startup behavior
   */
  static shouldStartMinimized(): boolean {
    return process.argv.includes('--minimized');
  }
}

// Singleton instance
export const autoStartManager = new AutoStartManager();

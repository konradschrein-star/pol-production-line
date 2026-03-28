// System tray integration with service status indicators
// Provides quick access to common actions and service management
//
// PHASE 4 ENHANCEMENTS:
// - Real icon assets (SVG/ICO with graceful fallback)
// - Enhanced context menu with per-service status
// - Health monitor event integration
// - Resource usage in tooltip

import { Tray, Menu, nativeImage, shell, BrowserWindow, app, Notification } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { ServiceManager, ServiceStatus } from './services/manager';
import logger from './logger';

export type TrayIconState = 'green' | 'yellow' | 'red' | 'gray';

export class TrayManager {
  private tray: Tray | null = null;
  private serviceManager: ServiceManager;
  private currentState: TrayIconState = 'yellow';
  private mainWindow: BrowserWindow | null = null;
  private statusInterval: NodeJS.Timeout | null = null;

  constructor(serviceManager: ServiceManager) {
    this.serviceManager = serviceManager;
  }

  /**
   * Initialize system tray
   */
  init(mainWindow: BrowserWindow | null = null): void {
    this.mainWindow = mainWindow;

    // Load initial icon
    const iconPath = this.getIconPath('yellow');
    const icon = this.loadIcon(iconPath);
    this.tray = new Tray(icon);

    this.tray.setToolTip('Obsidian News Desk - Starting...');

    // Build context menu
    this.updateContextMenu();

    // Update status every 10 seconds
    this.statusInterval = setInterval(() => this.updateStatus(), 10000);

    // Initial status update
    this.updateStatus();

    // Wire health monitor events (if available)
    if (this.serviceManager.healthMonitor) {
      this.serviceManager.healthMonitor.on('health:service-down', (service: string) => {
        this.showNotification('Service Down', `${service} has stopped unexpectedly`, 'error');
        this.updateStatus();
      });

      this.serviceManager.healthMonitor.on('health:service-up', (service: string) => {
        this.showNotification('Service Recovered', `${service} is now running`, 'info');
        this.updateStatus();
      });
    }

    logger.info('System tray initialized', 'tray');
  }

  /**
   * Update tray icon based on service status
   */
  private async updateStatus(): Promise<void> {
    try {
      const status = await this.serviceManager.getStatus();
      const newState = this.determineIconState(status);

      if (newState !== this.currentState) {
        this.currentState = newState;
        this.updateIcon(newState);
      }

      // Always update tooltip and menu (status details may change)
      const tooltip = await this.buildTooltip();
      this.tray?.setToolTip(tooltip);
      await this.updateContextMenuWithStatus(status);
    } catch (error) {
      logger.error('Failed to update tray status', 'tray', { error });
    }
  }

  /**
   * Determine icon state based on service status
   */
  private determineIconState(status: ServiceStatus): TrayIconState {
    // Red: Any service is down
    if (!status.docker.running || !status.docker.postgres || !status.docker.redis) {
      return 'red';
    }

    if (!status.workers.running || !status.nextjs.running) {
      return 'red';
    }

    // Green: All services running
    return 'green';
  }

  /**
   * Update tray icon
   */
  private updateIcon(state: TrayIconState): void {
    if (this.tray) {
      const iconPath = this.getIconPath(state);
      const icon = this.loadIcon(iconPath);
      this.tray.setImage(icon);
    }
  }

  /**
   * Build tooltip with service status and resource usage
   */
  private async buildTooltip(): Promise<string> {
    try {
      const status = await this.serviceManager.getStatus();
      const lines = ['Obsidian News Desk'];

      if (status.docker.running) {
        lines.push(`Docker: ${status.docker.postgres ? '✓' : '✗'} Postgres, ${status.docker.redis ? '✓' : '✗'} Redis`);
      } else {
        lines.push('Docker: ✗ Not running');
      }

      if (status.workers.running && status.workers.pid) {
        lines.push(`Workers: Running (PID ${status.workers.pid})`);
      } else {
        lines.push('Workers: ✗ Not running');
      }

      if (status.nextjs.running && status.nextjs.pid) {
        lines.push(`Next.js: Running (PID ${status.nextjs.pid})`);
      } else {
        lines.push('Next.js: ✗ Not running');
      }

      return lines.join('\n');
    } catch (err) {
      return 'Obsidian News Desk';
    }
  }

  /**
   * Get icon path for state
   * Tries multiple formats: .ico (Windows), .svg, .png
   */
  private getIconPath(state: TrayIconState): string {
    const iconName = `tray-${state}`;
    const baseDir = path.join(app.getAppPath(), 'resources', 'icons');

    // Try formats in order of preference
    const formats = ['.ico', '.svg', '.png'];

    for (const format of formats) {
      const iconPath = path.join(baseDir, iconName + format);
      if (fs.existsSync(iconPath)) {
        return iconPath;
      }
    }

    // Fallback: Use app icon
    logger.warn(`Tray icon not found: ${iconName}, using fallback`, 'tray');
    return path.join(app.getAppPath(), 'resources', 'icon.png');
  }

  /**
   * Load icon with graceful fallback
   */
  private loadIcon(iconPath: string): Electron.NativeImage {
    try {
      const icon = nativeImage.createFromPath(iconPath);
      if (icon.isEmpty()) {
        throw new Error('Icon is empty');
      }
      return icon;
    } catch (err) {
      logger.error(`Failed to load icon: ${iconPath}`, 'tray', { error: err });
      // Return empty icon (Electron will use default)
      return nativeImage.createEmpty();
    }
  }

  /**
   * Update context menu
   */
  private updateContextMenu(): void {
    // Call async version with default status
    this.serviceManager.getStatus().then(status => {
      this.updateContextMenuWithStatus(status);
    }).catch(err => {
      logger.error('Failed to get status for context menu', 'tray', { error: err });
    });
  }

  /**
   * Update context menu with service status (Phase 4 enhanced version)
   */
  private async updateContextMenuWithStatus(status: ServiceStatus): Promise<void> {
    if (!this.tray) return;

    const statusLabel = this.getStatusLabel();

    const contextMenu = Menu.buildFromTemplate([
      {
        label: '🎬 Obsidian News Desk',
        enabled: false,
      },
      {
        label: statusLabel,
        enabled: false,
      },
      { type: 'separator' },
      {
        label: 'Open Dashboard',
        click: () => this.openDashboard(),
      },
      { type: 'separator' },
      {
        label: 'Services',
        submenu: [
          {
            label: `Docker: ${status.docker.running ? '✓ Running' : '✗ Stopped'}`,
            enabled: false,
          },
          {
            label: `  PostgreSQL: ${status.docker.postgres ? '✓ Running' : '✗ Stopped'}`,
            enabled: false,
          },
          {
            label: `  Redis: ${status.docker.redis ? '✓ Running' : '✗ Stopped'}`,
            enabled: false,
          },
          {
            label: `Next.js: ${status.nextjs.running ? '✓ Running' : '✗ Stopped'}${status.nextjs.pid ? ` (PID ${status.nextjs.pid})` : ''}`,
            enabled: false,
          },
          {
            label: `Workers: ${status.workers.running ? '✓ Running' : '✗ Stopped'}${status.workers.pid ? ` (PID ${status.workers.pid})` : ''}`,
            enabled: false,
          },
          { type: 'separator' },
          {
            label: 'Restart All Services',
            click: () => this.restartServices(),
          },
        ],
      },
      { type: 'separator' },
      {
        label: 'Stop Services',
        click: () => this.stopServices(),
      },
      {
        label: 'View Logs',
        click: () => this.openLogs(),
      },
      {
        label: 'Settings',
        click: () => this.openSettings(),
      },
      { type: 'separator' },
      {
        label: 'Show Tutorial',
        click: () => this.showTutorial(),
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => this.quit(),
      },
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  /**
   * Get status label for menu
   */
  private getStatusLabel(): string {
    switch (this.currentState) {
      case 'green':
        return '● All Services Running';
      case 'yellow':
        return '● Services Starting...';
      case 'red':
        return '● Service Error';
      default:
        return '● Unknown Status';
    }
  }

  /**
   * Open dashboard in browser
   */
  private openDashboard(): void {
    logger.info('Opening dashboard from tray', 'tray');

    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.show();
      this.mainWindow.focus();
    } else {
      shell.openExternal('http://localhost:8347');
    }
  }

  /**
   * Restart all services
   */
  private async restartServices(): Promise<void> {
    logger.info('Restarting services from tray', 'tray');

    try {
      this.currentState = 'yellow';
      this.updateIcon('yellow');
      this.updateContextMenu();

      await this.serviceManager.restartAll();

      this.showNotification('Services Restarted', 'All services have been restarted successfully', 'info');
    } catch (error: any) {
      logger.error('Failed to restart services from tray', 'tray', { error: error.message });
      this.showNotification('Restart Failed', 'Failed to restart services. Check logs for details.', 'error');
    }
  }

  /**
   * Stop all services
   */
  private async stopServices(): Promise<void> {
    logger.info('Stopping services from tray', 'tray');

    try {
      this.currentState = 'gray';
      this.updateIcon('gray');
      this.updateContextMenu();

      await this.serviceManager.stopAll();

      this.showNotification('Services Stopped', 'All services have been stopped gracefully', 'info');
    } catch (error: any) {
      logger.error('Failed to stop services from tray', 'tray', { error: error.message });
      this.showNotification('Stop Failed', 'Failed to stop services. Check logs for details.', 'error');
    }
  }

  /**
   * Open logs folder
   */
  private openLogs(): void {
    logger.info('Opening logs folder from tray', 'tray');
    const logsDir = logger.getLogsDirectory();
    shell.openPath(logsDir);
  }

  /**
   * Open settings page in main window (Phase 5)
   */
  private openSettings(): void {
    logger.info('Opening settings page from tray', 'tray');
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.loadURL('http://localhost:8347/settings');
      this.mainWindow.show();
      this.mainWindow.focus();
    } else {
      // Fallback if main window not available
      shell.openExternal('http://localhost:8347/settings');
    }
  }

  /**
   * Show tutorial
   */
  private showTutorial(): void {
    logger.info('Showing tutorial from tray', 'tray');
    // This will be implemented when we create the tutorial window
    // For now, just log
    console.log('TODO: Show tutorial window');
  }

  /**
   * Quit application
   */
  private async quit(): Promise<void> {
    logger.info('Quitting application from tray', 'tray');

    try {
      // Stop all services gracefully
      await this.serviceManager.stopAll();

      // Quit app
      app.quit();
    } catch (error: any) {
      logger.error('Error during quit', 'tray', { error: error.message });
      // Force quit anyway
      app.quit();
    }
  }

  /**
   * Show notification using Electron Notification API
   * Phase 4: Switched from displayBalloon to Notification API for better cross-platform support
   */
  showNotification(title: string, message: string, type: 'info' | 'error' = 'info'): void {
    try {
      new Notification({
        title,
        body: message,
        silent: false,
        icon: this.getIconPath(type === 'error' ? 'red' : 'green'),
      }).show();
    } catch (err) {
      logger.error('Failed to show notification', 'tray', { error: err });
    }
  }

  /**
   * Set main window reference
   */
  setMainWindow(window: BrowserWindow | null): void {
    this.mainWindow = window;
  }

  /**
   * Destroy tray
   */
  destroy(): void {
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }

    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }

    logger.info('System tray destroyed', 'tray');
  }
}

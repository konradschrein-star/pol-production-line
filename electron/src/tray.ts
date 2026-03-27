// System tray integration with service status indicators
// Provides quick access to common actions and service management

import { Tray, Menu, nativeImage, shell, BrowserWindow, app } from 'electron';
import * as path from 'path';
import { ServiceManager, ServiceStatus } from './services/manager';
import logger from './logger';

export type TrayIconState = 'green' | 'yellow' | 'red';

export class TrayManager {
  private tray: Tray | null = null;
  private serviceManager: ServiceManager;
  private currentState: TrayIconState = 'yellow';
  private mainWindow: BrowserWindow | null = null;

  constructor(serviceManager: ServiceManager) {
    this.serviceManager = serviceManager;
  }

  /**
   * Initialize system tray
   */
  init(mainWindow: BrowserWindow | null = null): void {
    this.mainWindow = mainWindow;

    // For now, use a simple icon (in production, use actual icon files)
    // We'll create proper icons in Phase 6
    const iconPath = this.getIconPath('yellow');
    this.tray = new Tray(iconPath);

    this.tray.setToolTip('Obsidian News Desk');

    // Build context menu
    this.updateContextMenu();

    // Update status every 10 seconds
    setInterval(() => this.updateStatus(), 10000);

    // Initial status update
    this.updateStatus();

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
        this.updateContextMenu();
      }
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
      this.tray.setImage(iconPath);
    }
  }

  /**
   * Get icon path for state (placeholder - will use real icons later)
   */
  private getIconPath(state: TrayIconState): string {
    // For now, return a simple path
    // In Phase 6, we'll create actual colored icon variants
    const iconName = `tray-${state}.png`;
    return path.join(__dirname, '..', 'build', iconName);
  }

  /**
   * Update context menu
   */
  private updateContextMenu(): void {
    if (!this.tray) return;

    const statusLabel = this.getStatusLabel();

    const contextMenu = Menu.buildFromTemplate([
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
        label: 'Restart Services',
        click: () => this.restartServices(),
      },
      {
        label: 'View Logs',
        click: () => this.openLogs(),
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

      this.showNotification('Services Restarted', 'All services have been restarted successfully');
    } catch (error: any) {
      logger.error('Failed to restart services from tray', 'tray', { error: error.message });
      this.showNotification('Restart Failed', 'Failed to restart services. Check logs for details.', 'error');
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
   * Show notification (balloon)
   */
  showNotification(title: string, message: string, type: 'info' | 'error' = 'info'): void {
    if (this.tray) {
      this.tray.displayBalloon({
        title,
        content: message,
        icon: this.getIconPath(type === 'error' ? 'red' : 'green'),
      });
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
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}

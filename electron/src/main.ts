// Enhanced main process with Service Manager, System Tray, Tutorial, and Auto-Updater

import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as dockerCheck from './docker/check';
import * as dockerLifecycle from './docker/lifecycle';
import * as configStorage from './config/storage';
import * as envGenerator from './config/env-generator';
import * as validator from './config/validator';
import { ServiceManager, StartupProgress } from './services/manager';
import { TrayManager } from './tray';
import { initAutoUpdater, checkForUpdates } from './updater';
import logger from './logger';

let mainWindow: BrowserWindow | null = null;
let wizardWindow: BrowserWindow | null = null;
let tutorialWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let serviceManager: ServiceManager | null = null;
let trayManager: TrayManager | null = null;

// Check if this is first run
const isFirstRun = configStorage.isFirstRun();

/**
 * Create setup wizard window
 */
function createWizardWindow() {
  logger.info('Creating wizard window', 'main');

  wizardWindow = new BrowserWindow({
    width: 800,
    height: 700,
    backgroundColor: '#1a1a1a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'Obsidian News Desk - Setup Wizard',
    autoHideMenuBar: true,
    resizable: false,
    center: true,
  });

  const wizardPath = path.join(__dirname, '..', 'src', 'installer', 'pages', 'wizard.html');
  wizardWindow.loadFile(wizardPath);

  if (process.env.NODE_ENV === 'development') {
    wizardWindow.webContents.openDevTools();
  }

  wizardWindow.on('closed', () => {
    logger.info('Wizard window closed', 'main');
    wizardWindow = null;
  });
}

/**
 * Create tutorial window
 */
function createTutorialWindow() {
  logger.info('Creating tutorial window', 'main');

  tutorialWindow = new BrowserWindow({
    width: 900,
    height: 700,
    backgroundColor: '#1a1a1a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'Getting Started - Obsidian News Desk',
    autoHideMenuBar: true,
    resizable: false,
    center: true,
  });

  const tutorialPath = path.join(__dirname, '..', 'src', 'installer', 'pages', 'tutorial.html');
  tutorialWindow.loadFile(tutorialPath);

  if (process.env.NODE_ENV === 'development') {
    tutorialWindow.webContents.openDevTools();
  }

  tutorialWindow.on('closed', () => {
    logger.info('Tutorial window closed', 'main');
    tutorialWindow = null;
  });
}

/**
 * Create splash screen
 */
function createSplashWindow() {
  logger.info('Creating splash window', 'main');

  splashWindow = new BrowserWindow({
    width: 500,
    height: 400,
    backgroundColor: '#1a1a1a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    frame: false,
    transparent: false,
    center: true,
    alwaysOnTop: true,
    skipTaskbar: true,
  });

  const splashPath = path.join(__dirname, '..', 'src', 'installer', 'pages', 'splash.html');
  splashWindow.loadFile(splashPath);

  splashWindow.on('closed', () => {
    logger.info('Splash window closed', 'main');
    splashWindow = null;
  });
}

/**
 * Create main application window
 */
function createMainWindow() {
  logger.info('Creating main window', 'main');

  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    backgroundColor: '#1a1a1a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'Obsidian News Desk',
    autoHideMenuBar: true,
    show: false, // Don't show until ready
  });

  mainWindow.loadURL('http://localhost:8347');

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Minimize to tray instead of closing
  mainWindow.on('close', (event) => {
    if ((app as any).isQuitting) {
      return; // Allow quit
    }

    // Minimize to tray
    event.preventDefault();
    mainWindow?.hide();

    // Show notification on first minimize
    const config = configStorage.getConfig();
    if (!config.hasShownMinimizeNotification && trayManager) {
      trayManager.showNotification(
        'App Minimized',
        'Obsidian News Desk is still running in the system tray. Right-click the tray icon to quit.'
      );
      configStorage.updateConfig({ hasShownMinimizeNotification: true });
    }

    logger.info('Main window minimized to tray', 'main');
  });

  mainWindow.on('closed', () => {
    logger.info('Main window closed', 'main');
    mainWindow = null;
  });

  // Update tray with window reference
  if (trayManager) {
    trayManager.setMainWindow(mainWindow);
  }
}

/**
 * Start all services and show main window
 */
async function startupSequence() {
  try {
    logger.info('Starting application startup sequence', 'main');

    // Show splash screen
    createSplashWindow();

    // Wait a bit for splash to render
    await sleep(500);

    // Get config
    const config = configStorage.getConfig();

    // Build environment variables
    const envVars: Record<string, string> = {
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://obsidian:obsidian_password@localhost:5432/obsidian_news',
      REDIS_HOST: 'localhost',
      REDIS_PORT: '6379',
      REDIS_PASSWORD: 'obsidian_redis_password',
      AI_PROVIDER: config.aiProvider,
    };

    // Add API keys from encrypted storage
    const openaiKey = configStorage.getAPIKey('openai');
    const claudeKey = configStorage.getAPIKey('claude');
    const googleKey = configStorage.getAPIKey('google');
    const groqKey = configStorage.getAPIKey('groq');
    const whiskToken = configStorage.getAPIKey('whisk');

    if (openaiKey) envVars.OPENAI_API_KEY = openaiKey;
    if (claudeKey) envVars.ANTHROPIC_API_KEY = claudeKey;
    if (googleKey) envVars.GOOGLE_AI_API_KEY = googleKey;
    if (groqKey) envVars.GROQ_API_KEY = groqKey;
    if (whiskToken) envVars.WHISK_API_TOKEN = whiskToken;

    // Create service manager
    const appDir = app.getAppPath();
    serviceManager = new ServiceManager(appDir, envVars);

    // Set progress callback
    serviceManager.setProgressCallback((progress: StartupProgress) => {
      logger.info(`Startup: ${progress.message}`, 'main', { step: progress.step, status: progress.status });

      // Send to splash window
      if (splashWindow) {
        splashWindow.webContents.send('startup-progress', progress);
      }

      // Handle errors
      if (progress.status === 'failed') {
        showStartupError(progress.step, progress.message, progress.error);
      }
    });

    // Start all services
    await serviceManager.startAll();

    logger.info('All services started successfully', 'main');

    // Close splash screen
    if (splashWindow) {
      splashWindow.close();
      splashWindow = null;
    }

    // Check if tutorial should be shown
    if (!configStorage.getTutorialComplete()) {
      createTutorialWindow();
    } else {
      // Create main window immediately
      createMainWindow();
    }

    // Initialize system tray
    trayManager = new TrayManager(serviceManager);
    trayManager.init(mainWindow);

    // Initialize auto-updater
    initAutoUpdater();

  } catch (error: any) {
    logger.error('Startup sequence failed', 'main', { error: error.message });

    // Close splash
    if (splashWindow) {
      splashWindow.close();
      splashWindow = null;
    }

    // Show error dialog
    dialog.showErrorBox(
      'Startup Failed',
      `Failed to start Obsidian News Desk:\n\n${error.message}\n\nPlease check the logs for details.`
    );

    app.quit();
  }
}

/**
 * Show startup error dialog
 */
function showStartupError(step: string, message: string, error?: string) {
  const errorDetails = error ? `\n\nDetails:\n${error}` : '';

  dialog.showMessageBox({
    type: 'error',
    title: 'Startup Error',
    message: `Failed during: ${step}`,
    detail: `${message}${errorDetails}\n\nWould you like to view the logs?`,
    buttons: ['View Logs', 'Quit'],
    defaultId: 0,
  }).then((result) => {
    if (result.response === 0) {
      // View logs
      const logsDir = logger.getLogsDirectory();
      shell.openPath(logsDir);
    }
    app.quit();
  });
}

/**
 * Utility: sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function to send progress messages to wizard window
function sendProgress(message: string) {
  if (wizardWindow) {
    wizardWindow.webContents.send('progress', message);
  }
  logger.info(message, 'wizard');
}

// ============================================================
// IPC Handlers
// ============================================================

// Tutorial handlers
ipcMain.handle('tutorial:skip', async () => {
  logger.info('User skipped tutorial', 'main');
  configStorage.setTutorialComplete();

  if (tutorialWindow) {
    tutorialWindow.close();
    tutorialWindow = null;
  }

  // Create main window
  createMainWindow();
});

ipcMain.handle('tutorial:finish', async () => {
  logger.info('User finished tutorial', 'main');
  configStorage.setTutorialComplete();

  if (tutorialWindow) {
    tutorialWindow.close();
    tutorialWindow = null;
  }

  // Create main window
  createMainWindow();
});

// Docker operations (from original main.ts)
ipcMain.handle('docker:getStatus', async () => {
  return await dockerCheck.getDockerStatus();
});

ipcMain.handle('docker:install', async () => {
  await dockerCheck.installDockerDesktop(sendProgress);
});

ipcMain.handle('docker:start', async () => {
  await dockerCheck.startDockerDesktop();
});

ipcMain.handle('docker:pullImages', async () => {
  const appDir = app.getAppPath();
  await dockerLifecycle.pullDockerImages(appDir, sendProgress);
});

ipcMain.handle('docker:startCompose', async () => {
  const appDir = app.getAppPath();
  await dockerLifecycle.startDockerCompose(appDir, sendProgress);
});

ipcMain.handle('docker:stopCompose', async () => {
  const appDir = app.getAppPath();
  await dockerLifecycle.stopDockerCompose(appDir, sendProgress);
});

ipcMain.handle('docker:waitForServices', async () => {
  await dockerLifecycle.waitForAllServices(sendProgress);
});

ipcMain.handle('docker:getContainerStatus', async () => {
  return await dockerLifecycle.getContainerStatus();
});

ipcMain.handle('ping', async () => {
  return 'pong';
});

// Configuration operations
ipcMain.handle('config:validateAPIKey', async (_event, provider, apiKey) => {
  return await validator.validateAPIKey(provider, apiKey);
});

ipcMain.handle('config:validateStoragePath', async (_event, storagePath) => {
  return await envGenerator.validateStoragePath(storagePath);
});

ipcMain.handle('config:getDiskSpace', async (_event, storagePath) => {
  return await envGenerator.getDiskSpace(storagePath);
});

ipcMain.handle('config:selectDirectory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select Storage Directory',
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
});

ipcMain.handle('config:createStorageDirectories', async (_event, storagePath) => {
  await envGenerator.createStorageDirectories(storagePath);
  sendProgress(`Created storage directories at ${storagePath}`);
});

ipcMain.handle('config:generateEnv', async (_event, config) => {
  const appDir = app.getAppPath();
  await envGenerator.writeEnvFile(appDir, config);
  sendProgress('Generated .env configuration file');
});

ipcMain.handle('config:save', async (_event, config) => {
  // Migrate to encrypted storage
  if (config.openaiKey) configStorage.setAPIKey('openai', config.openaiKey);
  if (config.claudeKey) configStorage.setAPIKey('claude', config.claudeKey);
  if (config.googleKey) configStorage.setAPIKey('google', config.googleKey);
  if (config.groqKey) configStorage.setAPIKey('groq', config.groqKey);
  if (config.whiskToken) configStorage.setAPIKey('whisk', config.whiskToken);

  configStorage.updateConfig(config);
  configStorage.setFirstRunComplete();
  sendProgress('Saved configuration');

  // After saving config, close wizard and start app
  if (wizardWindow) {
    setTimeout(() => {
      wizardWindow?.close();
      startupSequence();
    }, 500);
  }
});

ipcMain.handle('config:get', async () => {
  return configStorage.getConfig();
});

// Worker operations (legacy - now handled by ServiceManager)
ipcMain.handle('workers:start', async () => {
  sendProgress('Workers are managed automatically by the service manager');
});

ipcMain.handle('workers:stop', async () => {
  sendProgress('Workers are managed automatically by the service manager');
});

ipcMain.handle('workers:getStatus', async () => {
  if (serviceManager) {
    const status = await serviceManager.getStatus();
    return status.workers;
  }
  return { running: false };
});

// ============================================================
// App Lifecycle
// ============================================================

app.whenReady().then(async () => {
  logger.info('App ready', 'main');

  // Migrate plaintext API keys to encrypted storage
  configStorage.migrateToEncrypted();

  // Show wizard on first run, otherwise start app
  if (isFirstRun) {
    logger.info('First run detected, showing wizard', 'main');
    createWizardWindow();
  } else {
    logger.info('Starting application', 'main');
    await startupSequence();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      if (isFirstRun) {
        createWizardWindow();
      } else {
        createMainWindow();
      }
    }
  });
});

// Global flag for quitting
app.on('before-quit', () => {
  (app as any).isQuitting = true;
});

app.on('window-all-closed', () => {
  // Don't quit if windows are closed - app runs in tray
  // Only quit when explicitly requested
  if ((app as any).isQuitting) {
    logger.info('Quitting application', 'main');

    // Stop all services
    if (serviceManager) {
      serviceManager.stopAll().catch(err => {
        logger.error('Error stopping services during quit', 'main', { error: err.message });
      });
    }

    // Destroy tray
    if (trayManager) {
      trayManager.destroy();
    }

    // Quit on non-macOS
    if (process.platform !== 'darwin') {
      app.quit();
    }
  }
});

// Crash handler
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', 'main', { error: error.message, stack: error.stack });

  dialog.showMessageBox({
    type: 'error',
    title: 'Application Error',
    message: 'An unexpected error occurred',
    detail: `${error.message}\n\nWould you like to view the logs?`,
    buttons: ['View Logs', 'Restart', 'Quit'],
    defaultId: 0,
  }).then((result) => {
    if (result.response === 0) {
      // View logs
      const logsDir = logger.getLogsDirectory();
      shell.openPath(logsDir);
    } else if (result.response === 1) {
      // Restart
      app.relaunch();
      app.quit();
    } else {
      // Quit
      app.quit();
    }
  });
});

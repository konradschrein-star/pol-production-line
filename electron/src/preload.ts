import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // General
  ping: () => ipcRenderer.invoke('ping'),

  // Docker operations
  docker: {
    getStatus: () => ipcRenderer.invoke('docker:getStatus'),
    install: () => ipcRenderer.invoke('docker:install'),
    start: () => ipcRenderer.invoke('docker:start'),
    pullImages: () => ipcRenderer.invoke('docker:pullImages'),
    startCompose: () => ipcRenderer.invoke('docker:startCompose'),
    stopCompose: () => ipcRenderer.invoke('docker:stopCompose'),
    waitForServices: () => ipcRenderer.invoke('docker:waitForServices'),
    getContainerStatus: () => ipcRenderer.invoke('docker:getContainerStatus'),
  },

  // Configuration operations
  config: {
    validateAPIKey: (provider: string, apiKey: string) =>
      ipcRenderer.invoke('config:validateAPIKey', provider, apiKey),
    validateStoragePath: (storagePath: string) =>
      ipcRenderer.invoke('config:validateStoragePath', storagePath),
    getDiskSpace: (storagePath: string) =>
      ipcRenderer.invoke('config:getDiskSpace', storagePath),
    selectDirectory: () => ipcRenderer.invoke('config:selectDirectory'),
    createStorageDirectories: (storagePath: string) =>
      ipcRenderer.invoke('config:createStorageDirectories', storagePath),
    generateEnv: (config: any) => ipcRenderer.invoke('config:generateEnv', config),
    save: (config: any) => ipcRenderer.invoke('config:save', config),
    get: () => ipcRenderer.invoke('config:get'),
  },

  // Worker operations
  workers: {
    start: () => ipcRenderer.invoke('workers:start'),
    stop: () => ipcRenderer.invoke('workers:stop'),
    getStatus: () => ipcRenderer.invoke('workers:getStatus'),
  },

  // Auto-start operations (Phase 5)
  autoStart: {
    toggle: (enabled: boolean, minimized?: boolean) =>
      ipcRenderer.invoke('auto-start:toggle', enabled, minimized),
    getStatus: () =>
      ipcRenderer.invoke('auto-start:getStatus'),
    enable: (minimized?: boolean) =>
      ipcRenderer.invoke('auto-start:enable', minimized),
  },

  // Update operations (Phase 6)
  updates: {
    // IPC methods
    checkForUpdates: () => ipcRenderer.invoke('update:check'),
    downloadUpdate: () => ipcRenderer.invoke('update:download'),
    installUpdate: () => ipcRenderer.invoke('update:install'),
    getStatus: () => ipcRenderer.invoke('update:getStatus'),

    // Event listeners
    onAvailable: (callback: (info: any) => void) => {
      ipcRenderer.on('update:available', (_event, info) => callback(info));
    },
    onNotAvailable: (callback: () => void) => {
      ipcRenderer.on('update:not-available', () => callback());
    },
    onProgress: (callback: (progress: any) => void) => {
      ipcRenderer.on('update:progress', (_event, progress) => callback(progress));
    },
    onDownloaded: (callback: (info: any) => void) => {
      ipcRenderer.on('update:downloaded', (_event, info) => callback(info));
    },
    onError: (callback: (error: string) => void) => {
      ipcRenderer.on('update:error', (_event, error) => callback(error));
    },

    // Cleanup
    removeUpdateListeners: () => {
      ipcRenderer.removeAllListeners('update:available');
      ipcRenderer.removeAllListeners('update:not-available');
      ipcRenderer.removeAllListeners('update:progress');
      ipcRenderer.removeAllListeners('update:downloaded');
      ipcRenderer.removeAllListeners('update:error');
    },
  },

  // Progress events
  onProgress: (callback: (message: string) => void) => {
    ipcRenderer.on('progress', (_event, message) => callback(message));
  },

  // Remove progress listener
  removeProgressListener: () => {
    ipcRenderer.removeAllListeners('progress');
  },

  // Tutorial operations
  skipTutorial: () => ipcRenderer.invoke('tutorial:skip'),
  finishTutorial: () => ipcRenderer.invoke('tutorial:finish'),

  // Startup progress events
  onStartupProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on('startup-progress', (_event, progress) => callback(progress));
  },
});

// TypeScript declarations for window.electronAPI
declare global {
  interface Window {
    electronAPI: {
      ping: () => Promise<string>;
      docker: {
        getStatus: () => Promise<{
          installed: boolean;
          running: boolean;
          version?: string;
          error?: string;
        }>;
        install: () => Promise<void>;
        start: () => Promise<void>;
        pullImages: () => Promise<void>;
        startCompose: () => Promise<void>;
        stopCompose: () => Promise<void>;
        waitForServices: () => Promise<void>;
        getContainerStatus: () => Promise<Array<{
          name: string;
          running: boolean;
          healthy: boolean;
        }>>;
      };
      config: {
        validateAPIKey: (provider: string, apiKey: string) => Promise<{
          valid: boolean;
          error?: string;
          provider?: string;
          modelAccess?: string[];
        }>;
        validateStoragePath: (storagePath: string) => Promise<boolean>;
        getDiskSpace: (storagePath: string) => Promise<{
          available: number;
          total: number;
        }>;
        selectDirectory: () => Promise<string | null>;
        createStorageDirectories: (storagePath: string) => Promise<void>;
        generateEnv: (config: any) => Promise<void>;
        save: (config: any) => Promise<void>;
        get: () => Promise<any>;
      };
      workers: {
        start: () => Promise<void>;
        stop: () => Promise<void>;
        getStatus: () => Promise<{ running: boolean; pid?: number }>;
      };
      autoStart: {
        toggle: (enabled: boolean, minimized?: boolean) => Promise<{
          success: boolean;
          enabled?: boolean;
          error?: string;
        }>;
        getStatus: () => Promise<{
          success: boolean;
          enabled?: boolean;
          error?: string;
        }>;
        enable: (minimized?: boolean) => Promise<{
          success: boolean;
          error?: string;
        }>;
      };
      updates: {
        checkForUpdates: () => Promise<{ success: boolean; error?: string }>;
        downloadUpdate: () => Promise<{ success: boolean; error?: string }>;
        installUpdate: () => void;
        getStatus: () => Promise<{
          success: boolean;
          currentVersion?: string;
          error?: string;
        }>;
        onAvailable: (callback: (info: any) => void) => void;
        onNotAvailable: (callback: () => void) => void;
        onProgress: (callback: (progress: any) => void) => void;
        onDownloaded: (callback: (info: any) => void) => void;
        onError: (callback: (error: string) => void) => void;
        removeUpdateListeners: () => void;
      };
      onProgress: (callback: (message: string) => void) => void;
      removeProgressListener: () => void;
      skipTutorial: () => Promise<void>;
      finishTutorial: () => Promise<void>;
      onStartupProgress: (callback: (progress: any) => void) => void;
    };
  }
}

// For development - log that preload script loaded
console.log('Electron preload script loaded');

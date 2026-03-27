// Configuration storage using electron-store with encrypted API keys

import Store from 'electron-store';
import { safeStorage } from 'electron';
import * as path from 'path';
import * as os from 'os';

export interface AppConfig {
  isFirstRun: boolean;
  tutorialComplete: boolean;
  hasShownMinimizeNotification?: boolean;
  appDirectory: string;
  storagePath: string;
  aiProvider: 'openai' | 'claude' | 'google' | 'groq';
  openaiKey?: string; // Deprecated - use encrypted keys
  claudeKey?: string; // Deprecated - use encrypted keys
  googleKey?: string; // Deprecated - use encrypted keys
  groqKey?: string; // Deprecated - use encrypted keys
  whiskToken?: string; // Deprecated - use encrypted keys
  // Encrypted API keys (base64 encoded encrypted buffers)
  openaiKey_encrypted?: string;
  claudeKey_encrypted?: string;
  googleKey_encrypted?: string;
  groqKey_encrypted?: string;
  whiskToken_encrypted?: string;
  windowState?: {
    width: number;
    height: number;
    x?: number;
    y?: number;
    isMaximized?: boolean;
  };
  installationDate?: string;
  lastLaunch?: string;
}

const schema = {
  isFirstRun: {
    type: 'boolean',
    default: true,
  },
  tutorialComplete: {
    type: 'boolean',
    default: false,
  },
  appDirectory: {
    type: 'string',
  },
  storagePath: {
    type: 'string',
  },
  aiProvider: {
    type: 'string',
    enum: ['openai', 'claude', 'google', 'groq'],
    default: 'openai',
  },
  windowState: {
    type: 'object',
    properties: {
      width: { type: 'number', default: 1600 },
      height: { type: 'number', default: 900 },
      x: { type: 'number' },
      y: { type: 'number' },
      isMaximized: { type: 'boolean', default: false },
    },
  },
} as const;

// Create store instance
const store = new Store<AppConfig>({
  name: 'obsidian-news-desk-config',
  defaults: {
    isFirstRun: true,
    tutorialComplete: false,
    appDirectory: process.cwd(),
    storagePath: path.join(os.homedir(), 'ObsidianNewsDesk'),
    aiProvider: 'openai',
    windowState: {
      width: 1600,
      height: 900,
      isMaximized: false,
    },
  },
});

/**
 * Check if this is the first run
 */
export function isFirstRun(): boolean {
  return store.get('isFirstRun', true);
}

/**
 * Mark first run as complete
 */
export function setFirstRunComplete(): void {
  store.set('isFirstRun', false);
  store.set('installationDate', new Date().toISOString());
}

/**
 * Get full configuration
 */
export function getConfig(): AppConfig {
  return store.store;
}

/**
 * Update configuration
 */
export function updateConfig(config: Partial<AppConfig>): void {
  Object.entries(config).forEach(([key, value]) => {
    if (value !== undefined) {
      store.set(key as keyof AppConfig, value as any);
    }
  });
}

/**
 * Get storage path
 */
export function getStoragePath(): string {
  return store.get('storagePath');
}

/**
 * Set storage path
 */
export function setStoragePath(storagePath: string): void {
  store.set('storagePath', storagePath);
}

/**
 * Get AI provider configuration
 */
export function getAIConfig(): {
  provider: 'openai' | 'claude' | 'google' | 'groq';
  apiKey?: string;
} {
  const provider = store.get('aiProvider');
  const keyMap = {
    openai: 'openaiKey',
    claude: 'claudeKey',
    google: 'googleKey',
    groq: 'groqKey',
  } as const;

  const apiKey = store.get(keyMap[provider]);

  return { provider, apiKey };
}

/**
 * Set AI provider and API key
 */
export function setAIConfig(
  provider: 'openai' | 'claude' | 'google' | 'groq',
  apiKey: string
): void {
  store.set('aiProvider', provider);

  const keyMap = {
    openai: 'openaiKey',
    claude: 'claudeKey',
    google: 'googleKey',
    groq: 'groqKey',
  } as const;

  store.set(keyMap[provider], apiKey);
}

/**
 * Get Whisk API token
 */
export function getWhiskToken(): string | undefined {
  return store.get('whiskToken');
}

/**
 * Set Whisk API token
 */
export function setWhiskToken(token: string): void {
  store.set('whiskToken', token);
}

/**
 * Get window state
 */
export function getWindowState(): AppConfig['windowState'] {
  return store.get('windowState');
}

/**
 * Save window state
 */
export function saveWindowState(state: AppConfig['windowState']): void {
  store.set('windowState', state);
}

/**
 * Update last launch time
 */
export function updateLastLaunch(): void {
  store.set('lastLaunch', new Date().toISOString());
}

/**
 * Reset all configuration (for uninstall or reset)
 */
export function resetConfig(): void {
  store.clear();
}

/**
 * Get config file path (for debugging)
 */
export function getConfigPath(): string {
  return store.path;
}

/**
 * Export entire config as JSON (for backup)
 */
export function exportConfig(): string {
  return JSON.stringify(store.store, null, 2);
}

/**
 * Import config from JSON (for restore)
 */
export function importConfig(json: string): void {
  const config = JSON.parse(json);
  Object.entries(config).forEach(([key, value]) => {
    store.set(key as keyof AppConfig, value as any);
  });
}

/**
 * Encrypt and store API key (OS-level encryption)
 */
export function setAPIKey(provider: 'openai' | 'claude' | 'google' | 'groq' | 'whisk', key: string): void {
  if (!safeStorage.isEncryptionAvailable()) {
    // Fallback to plaintext if encryption not available (shouldn't happen on Windows)
    const fieldName = provider === 'whisk' ? 'whiskToken' : `${provider}Key`;
    store.set(fieldName as keyof AppConfig, key as any);
    return;
  }

  // Encrypt the key
  const encrypted = safeStorage.encryptString(key);
  const encryptedBase64 = encrypted.toString('base64');

  // Store encrypted key
  const fieldName = provider === 'whisk' ? 'whiskToken_encrypted' : `${provider}Key_encrypted`;
  store.set(fieldName as keyof AppConfig, encryptedBase64 as any);

  // Remove plaintext version if exists
  const plaintextField = provider === 'whisk' ? 'whiskToken' : `${provider}Key`;
  store.delete(plaintextField as keyof AppConfig);
}

/**
 * Decrypt and retrieve API key
 */
export function getAPIKey(provider: 'openai' | 'claude' | 'google' | 'groq' | 'whisk'): string | undefined {
  // Try encrypted version first
  const encryptedField = provider === 'whisk' ? 'whiskToken_encrypted' : `${provider}Key_encrypted`;
  const encryptedBase64 = store.get(encryptedField as keyof AppConfig);

  if (encryptedBase64 && typeof encryptedBase64 === 'string') {
    if (!safeStorage.isEncryptionAvailable()) {
      console.error('Encryption not available but encrypted key exists');
      return undefined;
    }

    try {
      const encrypted = Buffer.from(encryptedBase64, 'base64');
      return safeStorage.decryptString(encrypted);
    } catch (error) {
      console.error('Failed to decrypt API key:', error);
      return undefined;
    }
  }

  // Fallback to plaintext version (for migration)
  const plaintextField = provider === 'whisk' ? 'whiskToken' : `${provider}Key`;
  return store.get(plaintextField as keyof AppConfig) as string | undefined;
}

/**
 * Migrate plaintext API keys to encrypted storage
 */
export function migrateToEncrypted(): void {
  if (!safeStorage.isEncryptionAvailable()) {
    console.warn('Encryption not available, skipping migration');
    return;
  }

  const providers: Array<'openai' | 'claude' | 'google' | 'groq' | 'whisk'> = [
    'openai',
    'claude',
    'google',
    'groq',
    'whisk',
  ];

  providers.forEach((provider) => {
    const plaintextField = provider === 'whisk' ? 'whiskToken' : `${provider}Key`;
    const plainKey = store.get(plaintextField as keyof AppConfig);

    if (plainKey && typeof plainKey === 'string') {
      // Migrate to encrypted storage
      setAPIKey(provider, plainKey);
      console.log(`Migrated ${provider} API key to encrypted storage`);
    }
  });
}

/**
 * Check if tutorial is complete
 */
export function getTutorialComplete(): boolean {
  return store.get('tutorialComplete', false);
}

/**
 * Mark tutorial as complete
 */
export function setTutorialComplete(): void {
  store.set('tutorialComplete', true);
}

/**
 * Reset tutorial status (for "Show Tutorial Again")
 */
export function resetTutorial(): void {
  store.set('tutorialComplete', false);
}

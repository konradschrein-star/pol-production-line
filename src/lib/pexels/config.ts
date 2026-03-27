/**
 * Pexels SDK Configuration
 * Centralized configuration management for the Pexels module
 */

export interface PexelsConfig {
  /** Pexels API key */
  apiKey: string;

  /** Base URL for Pexels API */
  baseUrl?: string;

  /** Rate limit: requests per hour */
  rateLimitPerHour?: number;

  /** Rate limit: requests per month */
  rateLimitPerMonth?: number;

  /** Default search parameters */
  defaults?: {
    orientation?: 'landscape' | 'portrait' | 'square';
    size?: 'large' | 'medium' | 'small';
    perPage?: number;
    minDuration?: number;
    maxDuration?: number;
  };

  /** HTTP timeout in milliseconds */
  timeout?: number;

  /** Enable debug logging */
  debug?: boolean;

  /** Custom logger function */
  logger?: (level: 'info' | 'warn' | 'error', message: string, meta?: any) => void;
}

export const DEFAULT_CONFIG: Partial<PexelsConfig> = {
  baseUrl: 'https://api.pexels.com',
  rateLimitPerHour: 200,
  rateLimitPerMonth: 20000,
  timeout: 30000,
  debug: false,
  defaults: {
    orientation: 'landscape',
    perPage: 15,
    minDuration: 5,
    maxDuration: 30,
  },
};

/**
 * Create Pexels configuration from environment variables
 */
export function createConfigFromEnv(): PexelsConfig {
  const apiKey = process.env.PEXELS_API_KEY;

  if (!apiKey) {
    throw new Error('PEXELS_API_KEY environment variable is required');
  }

  return {
    apiKey,
    ...DEFAULT_CONFIG,
    debug: process.env.NODE_ENV === 'development',
  };
}

/**
 * Merge user config with defaults
 */
export function mergeConfig(userConfig: Partial<PexelsConfig>): PexelsConfig {
  if (!userConfig.apiKey) {
    throw new Error('Pexels API key is required');
  }

  return {
    ...DEFAULT_CONFIG,
    ...userConfig,
    defaults: {
      ...DEFAULT_CONFIG.defaults,
      ...userConfig.defaults,
    },
  } as PexelsConfig;
}

/**
 * Validate configuration
 */
export function validateConfig(config: PexelsConfig): void {
  if (!config.apiKey || typeof config.apiKey !== 'string') {
    throw new Error('Invalid API key: must be a non-empty string');
  }

  if (config.baseUrl && !config.baseUrl.startsWith('http')) {
    throw new Error('Invalid base URL: must start with http:// or https://');
  }

  if (config.timeout && (config.timeout < 1000 || config.timeout > 300000)) {
    throw new Error('Invalid timeout: must be between 1000ms and 300000ms');
  }
}

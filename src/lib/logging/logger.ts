/**
 * Centralized Logging System
 *
 * Structured logging for production monitoring and debugging.
 * Replaces console.log with context-aware, level-based logging.
 *
 * MODULAR DESIGN: Extensible with custom transports (file, external services)
 *
 * @module logger
 */

import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Log levels (ordered by severity)
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Log entry structure
 */
export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: string;          // e.g., 'images.worker', 'api.analyze'
  metadata?: Record<string, any>;  // Job IDs, user IDs, etc.
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  minLevel: LogLevel;         // Minimum level to log (default: DEBUG in dev, INFO in prod)
  enableConsole: boolean;     // Log to console (default: true)
  enableFile: boolean;        // Log to file (default: true in prod)
  logDirectory?: string;      // Directory for log files
  prettyPrint?: boolean;      // Human-readable formatting (default: true in dev)
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: LoggerConfig = {
  minLevel: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  enableConsole: true,
  enableFile: process.env.NODE_ENV === 'production',
  logDirectory: process.env.LOG_DIRECTORY || './logs',
  prettyPrint: process.env.NODE_ENV !== 'production',
};

/**
 * Logger class
 */
export class Logger {
  private config: LoggerConfig;
  private context?: string;

  constructor(context?: string, config: Partial<LoggerConfig> = {}) {
    this.context = context;
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Ensure log directory exists
    if (this.config.enableFile && this.config.logDirectory) {
      if (!existsSync(this.config.logDirectory)) {
        mkdirSync(this.config.logDirectory, { recursive: true });
      }
    }
  }

  /**
   * Create child logger with specific context
   */
  child(context: string): Logger {
    const fullContext = this.context ? `${this.context}.${context}` : context;
    return new Logger(fullContext, this.config);
  }

  /**
   * Log debug message
   */
  debug(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  /**
   * Log info message
   */
  info(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  /**
   * Log warning message
   */
  warn(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | string, metadata?: Record<string, any>): void {
    const errorObj = typeof error === 'string'
      ? new Error(error)
      : error;

    this.log(LogLevel.ERROR, message, {
      ...metadata,
      error: errorObj ? {
        name: errorObj.name,
        message: errorObj.message,
        stack: errorObj.stack,
      } : undefined,
    });
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, metadata?: Record<string, any>): void {
    if (level < this.config.minLevel) {
      return; // Skip logs below minimum level
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message,
      context: this.context,
      metadata: metadata && Object.keys(metadata).length > 0 ? metadata : undefined,
    };

    // Console output
    if (this.config.enableConsole) {
      this.writeToConsole(level, entry);
    }

    // File output (TODO: implement file rotation)
    if (this.config.enableFile) {
      // TODO: Implement file transport with rotation
      // For now, we'll keep using console
    }
  }

  /**
   * Write to console with formatting
   */
  private writeToConsole(level: LogLevel, entry: LogEntry): void {
    const emoji = this.getEmojiForLevel(level);
    const color = this.getColorForLevel(level);

    if (this.config.prettyPrint) {
      // Pretty format for development
      const contextStr = entry.context ? `[${entry.context}]` : '';
      const metadataStr = entry.metadata ? ` ${JSON.stringify(entry.metadata)}` : '';

      console.log(`${emoji} ${color}${contextStr}${'\x1b[0m'} ${entry.message}${metadataStr}`);

      if (entry.metadata?.error) {
        console.error(entry.metadata.error.stack);
      }
    } else {
      // JSON format for production
      console.log(JSON.stringify(entry));
    }
  }

  /**
   * Get emoji for log level
   */
  private getEmojiForLevel(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG: return '🔍';
      case LogLevel.INFO: return '✅';
      case LogLevel.WARN: return '⚠️';
      case LogLevel.ERROR: return '❌';
      default: return '📝';
    }
  }

  /**
   * Get ANSI color code for log level
   */
  private getColorForLevel(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG: return '\x1b[36m'; // Cyan
      case LogLevel.INFO: return '\x1b[32m';  // Green
      case LogLevel.WARN: return '\x1b[33m';  // Yellow
      case LogLevel.ERROR: return '\x1b[31m'; // Red
      default: return '\x1b[0m';              // Reset
    }
  }
}

// Global logger instance
export const logger = new Logger();

// Pre-configured domain loggers
export const apiLogger = logger.child('api');
export const workerLogger = logger.child('worker');
export const dbLogger = logger.child('db');
export const queueLogger = logger.child('queue');

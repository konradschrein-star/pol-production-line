/**
 * Structured Logging System
 *
 * Replaces console-only logging with persistent, queryable logs
 * Logs are written to database asynchronously (fire-and-forget)
 */

import { db } from '../db';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  category: string; // 'image_generation', 'token_refresh', 'rendering', 'system'
  message: string;
  details?: any;
  jobId?: string;
  sceneId?: string;
}

class Logger {
  /**
   * Write log entry to database (async, fire-and-forget)
   * Does not block execution if database write fails
   */
  private writeToDatabase(entry: LogEntry): void {
    // Async write without awaiting to avoid blocking
    db.query(
      `INSERT INTO system_logs (level, category, message, details, job_id, scene_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        entry.level,
        entry.category,
        entry.message,
        entry.details ? JSON.stringify(entry.details) : null,
        entry.jobId || null,
        entry.sceneId || null,
      ]
    ).catch(err => {
      // Silently fail if database unavailable (don't spam console)
      // Only log critical database errors to console
      if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
        console.error('[Logger] Database unavailable, logs not persisted');
      }
    });
  }

  /**
   * Debug log (verbose, development only)
   */
  debug(category: string, message: string, details?: any) {
    const entry: LogEntry = {
      timestamp: new Date(),
      level: 'debug',
      category,
      message,
      details,
    };

    // Only log debug in development
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[${category}] ${message}`, details || '');
      this.writeToDatabase(entry);
    }
  }

  /**
   * Info log (standard operation events)
   */
  info(category: string, message: string, details?: any) {
    const entry: LogEntry = {
      timestamp: new Date(),
      level: 'info',
      category,
      message,
      details,
    };

    console.log(`[${category}] ${message}`, details || '');
    this.writeToDatabase(entry);
  }

  /**
   * Warning log (potential issues, recoverable errors)
   */
  warn(category: string, message: string, details?: any) {
    const entry: LogEntry = {
      timestamp: new Date(),
      level: 'warn',
      category,
      message,
      details,
    };

    console.warn(`[${category}] ⚠️  ${message}`, details || '');
    this.writeToDatabase(entry);
  }

  /**
   * Error log (errors that affect single operations)
   */
  error(category: string, message: string, details?: any) {
    const entry: LogEntry = {
      timestamp: new Date(),
      level: 'error',
      category,
      message,
      details,
    };

    console.error(`[${category}] ❌ ${message}`, details || '');
    this.writeToDatabase(entry);
  }

  /**
   * Critical log (system-level failures, data loss, security issues)
   */
  critical(category: string, message: string, details?: any) {
    const entry: LogEntry = {
      timestamp: new Date(),
      level: 'critical',
      category,
      message,
      details,
    };

    console.error(`[${category}] 🚨 CRITICAL: ${message}`, details || '');
    this.writeToDatabase(entry);
  }

  /**
   * Log with explicit job ID context
   */
  logJob(
    level: LogLevel,
    category: string,
    message: string,
    jobId: string,
    details?: any
  ) {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      category,
      message,
      details,
      jobId,
    };

    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '';
    console.log(`[${category}] ${prefix} [Job ${jobId}] ${message}`, details || '');
    this.writeToDatabase(entry);
  }

  /**
   * Log with explicit scene ID context
   */
  logScene(
    level: LogLevel,
    category: string,
    message: string,
    jobId: string,
    sceneId: string,
    details?: any
  ) {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      category,
      message,
      details,
      jobId,
      sceneId,
    };

    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '';
    console.log(`[${category}] ${prefix} [Scene ${sceneId}] ${message}`, details || '');
    this.writeToDatabase(entry);
  }
}

// Singleton instance
export const logger = new Logger();

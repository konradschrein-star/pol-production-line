// Centralized logging system with file rotation
//
// Logs are written to: %APPDATA%/obsidian-news-desk/logs/
// - electron.log - Main process logs
// - docker.log - Docker Compose output
// - workers.log - BullMQ worker logs
// - nextjs.log - Next.js server logs

import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  source: string;
  message: string;
  data?: any;
}

class Logger {
  private logsDir: string;
  private maxFileSize = 10 * 1024 * 1024; // 10MB
  private maxBackupFiles = 5;

  constructor() {
    // Initialize logs directory
    const appData = app.getPath('userData');
    this.logsDir = path.join(appData, 'logs');

    // Create logs directory if it doesn't exist
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  /**
   * Log a debug message
   */
  debug(message: string, source: string = 'electron', data?: any): void {
    this.log('DEBUG', source, message, data);
  }

  /**
   * Log an info message
   */
  info(message: string, source: string = 'electron', data?: any): void {
    this.log('INFO', source, message, data);
  }

  /**
   * Log a warning message
   */
  warn(message: string, source: string = 'electron', data?: any): void {
    this.log('WARN', source, message, data);
  }

  /**
   * Log an error message
   */
  error(message: string, source: string = 'electron', data?: any): void {
    this.log('ERROR', source, message, data);
  }

  /**
   * Write log entry to appropriate file
   */
  private log(level: LogLevel, source: string, message: string, data?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      source,
      message,
      data,
    };

    // Format log line
    const logLine = this.formatLogEntry(entry);

    // Determine log file based on source
    const logFile = this.getLogFile(source);

    // Write to file
    this.writeToFile(logFile, logLine);

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      const consoleMethod = level === 'ERROR' ? 'error' : level === 'WARN' ? 'warn' : 'log';
      console[consoleMethod](`[${source}]`, message, data || '');
    }
  }

  /**
   * Format log entry as string
   */
  private formatLogEntry(entry: LogEntry): string {
    const dataStr = entry.data ? ` | ${JSON.stringify(entry.data)}` : '';
    return `${entry.timestamp} [${entry.level}] [${entry.source}] ${entry.message}${dataStr}\n`;
  }

  /**
   * Determine log file path based on source
   */
  private getLogFile(source: string): string {
    let fileName = 'electron.log';

    if (source === 'docker') {
      fileName = 'docker.log';
    } else if (source === 'workers') {
      fileName = 'workers.log';
    } else if (source === 'nextjs') {
      fileName = 'nextjs.log';
    }

    return path.join(this.logsDir, fileName);
  }

  /**
   * Write log line to file with rotation
   */
  private writeToFile(filePath: string, logLine: string): void {
    try {
      // Check file size and rotate if needed
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.size >= this.maxFileSize) {
          this.rotateLogFile(filePath);
        }
      }

      // Append to log file
      fs.appendFileSync(filePath, logLine, 'utf-8');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  /**
   * Rotate log file (rename current file, delete oldest backup)
   */
  private rotateLogFile(filePath: string): void {
    try {
      const dir = path.dirname(filePath);
      const ext = path.extname(filePath);
      const baseName = path.basename(filePath, ext);

      // Delete oldest backup if exists
      const oldestBackup = path.join(dir, `${baseName}.${this.maxBackupFiles}${ext}`);
      if (fs.existsSync(oldestBackup)) {
        fs.unlinkSync(oldestBackup);
      }

      // Shift existing backups
      for (let i = this.maxBackupFiles - 1; i >= 1; i--) {
        const currentBackup = path.join(dir, `${baseName}.${i}${ext}`);
        const nextBackup = path.join(dir, `${baseName}.${i + 1}${ext}`);

        if (fs.existsSync(currentBackup)) {
          fs.renameSync(currentBackup, nextBackup);
        }
      }

      // Rename current log to .1
      const firstBackup = path.join(dir, `${baseName}.1${ext}`);
      fs.renameSync(filePath, firstBackup);
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }

  /**
   * Get logs directory path
   */
  getLogsDirectory(): string {
    return this.logsDir;
  }

  /**
   * Export all logs as ZIP (returns path to ZIP file)
   */
  exportLogs(): string {
    const zipPath = path.join(this.logsDir, `logs-export-${Date.now()}.zip`);
    // For now, just return the logs directory path
    // In a future enhancement, we could add archiver/jszip to create actual ZIP
    return this.logsDir;
  }

  /**
   * Clear all logs (useful for troubleshooting)
   */
  clearAllLogs(): void {
    const logFiles = fs.readdirSync(this.logsDir);

    for (const file of logFiles) {
      if (file.endsWith('.log')) {
        const filePath = path.join(this.logsDir, file);
        try {
          fs.unlinkSync(filePath);
        } catch (error) {
          console.error(`Failed to delete ${file}:`, error);
        }
      }
    }

    this.info('All logs cleared', 'electron');
  }

  /**
   * Get recent log entries from a specific log file
   */
  getRecentLogs(source: string = 'electron', lines: number = 100): string[] {
    const logFile = this.getLogFile(source);

    if (!fs.existsSync(logFile)) {
      return [];
    }

    try {
      const content = fs.readFileSync(logFile, 'utf-8');
      const allLines = content.split('\n').filter(line => line.trim());

      // Return last N lines
      return allLines.slice(-lines);
    } catch (error) {
      console.error('Failed to read log file:', error);
      return [];
    }
  }
}

// Singleton instance
const logger = new Logger();

export default logger;

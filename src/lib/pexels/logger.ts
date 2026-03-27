/**
 * Pexels SDK Logger
 * Structured logging with configurable output
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
}

export class ConsoleLogger implements Logger {
  constructor(private enabled: boolean = true, private prefix: string = '[Pexels]') {}

  debug(message: string, meta?: any): void {
    if (this.enabled) {
      console.debug(`${this.prefix} ${message}`, meta || '');
    }
  }

  info(message: string, meta?: any): void {
    if (this.enabled) {
      console.log(`${this.prefix} ${message}`, meta || '');
    }
  }

  warn(message: string, meta?: any): void {
    if (this.enabled) {
      console.warn(`${this.prefix} ${message}`, meta || '');
    }
  }

  error(message: string, meta?: any): void {
    if (this.enabled) {
      console.error(`${this.prefix} ${message}`, meta || '');
    }
  }
}

export class NoOpLogger implements Logger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}

export function createLogger(config: { debug?: boolean; logger?: Logger }): Logger {
  if (config.logger) {
    return config.logger;
  }

  if (config.debug) {
    return new ConsoleLogger(true);
  }

  return new NoOpLogger();
}

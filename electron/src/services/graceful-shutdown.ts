/**
 * Graceful Shutdown - Safely stop services with proper cleanup
 *
 * CRITICAL FOR DATA INTEGRITY:
 * - Workers: Drain BullMQ queues (finish active rendering jobs)
 * - Next.js: Complete in-flight HTTP requests
 * - Docker: Stop containers in order
 *
 * Timeout fallback: SIGTERM → SIGKILL after timeout if process doesn't exit
 *
 * BULLMQ SHUTDOWN IMPLEMENTATION:
 * Workers MUST handle SIGTERM signal to drain queues gracefully.
 * This prevents corrupted videos and data loss from force-killed rendering jobs.
 *
 * Worker code must implement:
 * ```typescript
 * process.on('SIGTERM', async () => {
 *   logger.info('[Worker] Received SIGTERM, draining active jobs...');
 *   await worker.close(); // Waits for active jobs (max timeout from BullMQ config)
 *   await queue.close();
 *   process.exit(0);
 * });
 * ```
 */

import { ChildProcess } from 'child_process';
import { exec } from 'child_process';
import { promisify } from 'util';
import logger from '../logger';

const execPromise = promisify(exec);

export interface GracefulShutdownOptions {
  service: string;
  process?: ChildProcess;
  timeout?: number; // Max wait time in ms (default: 30s)
}

/**
 * GracefulShutdown manages safe service termination with proper cleanup
 */
export class GracefulShutdown {
  /**
   * Gracefully shutdown a service
   */
  async shutdown(options: GracefulShutdownOptions): Promise<void> {
    const { service, process, timeout = 30000 } = options;

    logger.info(`Starting graceful shutdown of ${service} (timeout: ${timeout}ms)`, 'graceful-shutdown');

    try {
      switch (service) {
        case 'workers':
          await this.shutdownWorkers(process, timeout);
          break;
        case 'nextjs':
          await this.shutdownNextjs(process, timeout);
          break;
        case 'docker':
          await this.shutdownDocker(timeout);
          break;
        default:
          await this.shutdownGeneric(process, timeout);
      }

      logger.info(`${service} stopped gracefully`, 'graceful-shutdown');
    } catch (err: any) {
      logger.error(`Failed to gracefully shutdown ${service}: ${err.message}`, 'graceful-shutdown');
      throw err;
    }
  }

  /**
   * Shutdown BullMQ workers with queue draining
   *
   * CRITICAL: Workers must handle SIGTERM and drain BullMQ queues gracefully.
   *
   * The worker code MUST implement this signal handler:
   * ```typescript
   * process.on('SIGTERM', async () => {
   *   logger.info('[Worker] Received SIGTERM, draining active jobs...');
   *
   *   // 1. Stop accepting new jobs
   *   await worker.pause();
   *
   *   // 2. Wait for active jobs to complete
   *   //    This includes long-running renders (up to 20+ minutes)
   *   await worker.close(); // Waits for active jobs (respects BullMQ timeout config)
   *
   *   // 3. Disconnect from Redis
   *   await queue.close();
   *
   *   // 4. Exit cleanly
   *   logger.info('[Worker] All jobs completed, exiting...');
   *   process.exit(0);
   * });
   * ```
   *
   * If workers don't exit within timeout:
   * - Logs a warning
   * - Force kills with SIGKILL (may corrupt active video renders)
   */
  private async shutdownWorkers(process: ChildProcess | undefined, timeout: number): Promise<void> {
    if (!process) {
      logger.warn('Workers process not found, nothing to shutdown', 'graceful-shutdown');
      return;
    }

    logger.info('Sending SIGTERM to workers (BullMQ will drain active jobs)', 'graceful-shutdown');
    logger.info('This may take up to 20+ minutes if video rendering is in progress', 'graceful-shutdown');

    // Send SIGTERM to trigger graceful shutdown
    // Worker process MUST have SIGTERM handler (see docstring above)
    process.kill('SIGTERM');

    // Wait for process to exit gracefully
    const exited = await this.waitForExit(process, timeout);

    if (exited) {
      logger.info('Workers stopped gracefully (BullMQ queues drained)', 'graceful-shutdown');
    } else {
      logger.warn(
        'Workers did not exit within timeout, force killing (may corrupt active renders)',
        'graceful-shutdown'
      );
    }
  }

  /**
   * Shutdown Next.js server
   * Next.js handles SIGTERM gracefully by default:
   * - Stops accepting new requests
   * - Completes in-flight requests
   * - Closes server
   */
  private async shutdownNextjs(process: ChildProcess | undefined, timeout: number): Promise<void> {
    if (!process) {
      logger.warn('Next.js process not found, nothing to shutdown', 'graceful-shutdown');
      return;
    }

    logger.info('Sending SIGTERM to Next.js (will complete in-flight requests)', 'graceful-shutdown');

    process.kill('SIGTERM');

    const exited = await this.waitForExit(process, timeout);

    if (exited) {
      logger.info('Next.js stopped gracefully', 'graceful-shutdown');
    } else {
      logger.warn('Next.js did not exit within timeout, force killing', 'graceful-shutdown');
    }
  }

  /**
   * Shutdown Docker containers via docker-compose down
   * Docker Compose is graceful by default:
   * - Sends SIGTERM to containers
   * - Waits 10s for graceful shutdown
   * - Force kills with SIGKILL if needed
   */
  private async shutdownDocker(timeout: number): Promise<void> {
    logger.info('Running docker-compose down (graceful by default)', 'graceful-shutdown');

    try {
      // Get docker-compose file location (should be in app directory)
      // We use the timeout parameter here to avoid hanging indefinitely
      const { stdout, stderr } = await execPromise('docker-compose down', { timeout });

      if (stdout) logger.debug(`Docker shutdown output: ${stdout}`, 'graceful-shutdown');
      if (stderr) logger.debug(`Docker shutdown stderr: ${stderr}`, 'graceful-shutdown');

      logger.info('Docker containers stopped successfully', 'graceful-shutdown');
    } catch (err: any) {
      // If docker-compose fails, it might be because containers are already stopped
      logger.warn(`Docker shutdown error (may be already stopped): ${err.message}`, 'graceful-shutdown');
    }
  }

  /**
   * Generic graceful shutdown for any process
   */
  private async shutdownGeneric(process: ChildProcess | undefined, timeout: number): Promise<void> {
    if (!process) {
      logger.warn('Process not found, nothing to shutdown', 'graceful-shutdown');
      return;
    }

    logger.info('Sending SIGTERM to process', 'graceful-shutdown');

    process.kill('SIGTERM');
    await this.waitForExit(process, timeout);
  }

  /**
   * Wait for a process to exit, with timeout fallback to force kill
   *
   * @returns true if process exited gracefully, false if force killed
   */
  private waitForExit(process: ChildProcess, timeout: number): Promise<boolean> {
    return new Promise((resolve) => {
      let exited = false;

      // Set timeout to force kill
      const timer = setTimeout(() => {
        if (!exited) {
          logger.warn('Process did not exit within timeout, force killing with SIGKILL', 'graceful-shutdown');
          try {
            process.kill('SIGKILL');
          } catch (err) {
            // Process might already be dead
            logger.debug('Force kill failed (process may already be dead)', 'graceful-shutdown');
          }
          resolve(false);
        }
      }, timeout);

      // Listen for process exit
      process.on('exit', (code, signal) => {
        if (!exited) {
          exited = true;
          clearTimeout(timer);
          logger.debug(`Process exited with code ${code}, signal ${signal}`, 'graceful-shutdown');
          resolve(true);
        }
      });

      // Handle case where process is already dead
      if (process.killed || process.exitCode !== null) {
        exited = true;
        clearTimeout(timer);
        logger.debug('Process was already terminated', 'graceful-shutdown');
        resolve(true);
      }
    });
  }
}

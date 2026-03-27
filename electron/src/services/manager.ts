// Service Manager - Unified orchestrator for all services
// Manages Docker, BullMQ workers, and Next.js server lifecycle

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as dockerLifecycle from '../docker/lifecycle';
import * as workerSpawner from '../workers/spawner';
import * as portChecker from './port-checker';
import logger from '../logger';
import { resolveNodePath, getNodeRuntimeInfo } from '../../src/lib/runtime/node-resolver';

export interface ServiceStatus {
  docker: {
    running: boolean;
    postgres: boolean;
    redis: boolean;
  };
  workers: {
    running: boolean;
    pid?: number;
  };
  nextjs: {
    running: boolean;
    pid?: number;
    url?: string;
  };
}

export interface StartupProgress {
  step: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  message: string;
  error?: string;
}

export type ProgressCallback = (progress: StartupProgress) => void;

export class ServiceManager {
  private appDir: string;
  private envVars: Record<string, string>;
  private nextjsProcess: ChildProcess | null = null;
  private progressCallback?: ProgressCallback;
  private nodePath: string;

  constructor(appDir: string, envVars: Record<string, string>) {
    this.appDir = appDir;
    this.envVars = envVars;

    // Resolve Node.js runtime at initialization
    try {
      const nodeInfo = getNodeRuntimeInfo();
      this.nodePath = nodeInfo.path;
      logger.info(`Node.js runtime: ${nodeInfo.version} (${nodeInfo.source})`, 'service-manager');
    } catch (error: any) {
      throw new Error(`Failed to resolve Node.js runtime: ${error.message}`);
    }
  }

  /**
   * Set progress callback
   */
  setProgressCallback(callback: ProgressCallback): void {
    this.progressCallback = callback;
  }

  /**
   * Report progress
   */
  private reportProgress(step: string, status: StartupProgress['status'], message: string, error?: string): void {
    logger.info(`[${step}] ${message}`, 'service-manager');

    if (this.progressCallback) {
      this.progressCallback({ step, status, message, error });
    }
  }

  /**
   * Start all services in sequence
   */
  async startAll(): Promise<void> {
    try {
      logger.info('Starting all services...', 'service-manager');

      // Step 1: Check ports
      this.reportProgress('ports', 'in_progress', 'Checking port availability...');
      const conflicts = await portChecker.getConflictingPorts();

      if (conflicts.length > 0) {
        const conflictDetails = conflicts
          .map(c => `${portChecker.getPortName(c.port)} (${c.port}) - used by ${c.processName || 'Unknown'} (PID: ${c.pid || '?'})`)
          .join('\n');

        this.reportProgress('ports', 'failed', 'Port conflicts detected', conflictDetails);
        throw new Error(`Port conflicts detected:\n${conflictDetails}`);
      }

      this.reportProgress('ports', 'completed', 'All ports available');

      // Step 2: Start Docker Compose
      this.reportProgress('docker', 'in_progress', 'Starting Docker containers...');
      await dockerLifecycle.startDockerCompose(this.appDir);
      this.reportProgress('docker', 'completed', 'Docker containers started');

      // Step 3: Wait for services to be healthy
      this.reportProgress('health', 'in_progress', 'Waiting for database and Redis...');
      await dockerLifecycle.waitForAllServices();
      this.reportProgress('health', 'completed', 'Database and Redis are ready');

      // Step 4: Initialize database (if needed)
      this.reportProgress('database', 'in_progress', 'Initializing database schema...');
      await dockerLifecycle.initializeDatabase(this.appDir);
      this.reportProgress('database', 'completed', 'Database initialized');

      // Step 5: Start BullMQ workers
      this.reportProgress('workers', 'in_progress', 'Starting BullMQ workers...');
      workerSpawner.spawnWorkers(this.appDir, this.envVars, this.nodePath, (output) => {
        logger.info(output, 'workers');
      });
      this.reportProgress('workers', 'completed', 'BullMQ workers started');

      // Step 6: Start Next.js server
      this.reportProgress('nextjs', 'in_progress', 'Starting Next.js server...');
      await this.startNextjs();
      this.reportProgress('nextjs', 'completed', 'Next.js server started at http://localhost:8347');

      logger.info('All services started successfully', 'service-manager');
    } catch (error: any) {
      logger.error('Failed to start services', 'service-manager', { error: error.message });
      throw error;
    }
  }

  /**
   * Stop all services gracefully
   */
  async stopAll(): Promise<void> {
    try {
      logger.info('Stopping all services...', 'service-manager');

      // Stop Next.js server
      if (this.nextjsProcess) {
        logger.info('Stopping Next.js server...', 'service-manager');
        this.nextjsProcess.kill('SIGTERM');
        this.nextjsProcess = null;
      }

      // Stop workers
      logger.info('Stopping BullMQ workers...', 'service-manager');
      workerSpawner.killWorkers();

      // Stop Docker containers
      logger.info('Stopping Docker containers...', 'service-manager');
      await dockerLifecycle.stopDockerCompose(this.appDir);

      logger.info('All services stopped successfully', 'service-manager');
    } catch (error: any) {
      logger.error('Failed to stop services', 'service-manager', { error: error.message });
      throw error;
    }
  }

  /**
   * Restart all services
   */
  async restartAll(): Promise<void> {
    await this.stopAll();
    // Wait a bit before restarting
    await this.sleep(2000);
    await this.startAll();
  }

  /**
   * Restart a specific service
   */
  async restartService(name: 'docker' | 'workers' | 'nextjs'): Promise<void> {
    logger.info(`Restarting ${name}...`, 'service-manager');

    switch (name) {
      case 'docker':
        await dockerLifecycle.stopDockerCompose(this.appDir);
        await this.sleep(2000);
        await dockerLifecycle.startDockerCompose(this.appDir);
        await dockerLifecycle.waitForAllServices();
        break;

      case 'workers':
        workerSpawner.killWorkers();
        await this.sleep(1000);
        workerSpawner.spawnWorkers(this.appDir, this.envVars, this.nodePath);
        break;

      case 'nextjs':
        if (this.nextjsProcess) {
          this.nextjsProcess.kill('SIGTERM');
          this.nextjsProcess = null;
        }
        await this.sleep(1000);
        await this.startNextjs();
        break;
    }

    logger.info(`${name} restarted successfully`, 'service-manager');
  }

  /**
   * Get status of all services
   */
  async getStatus(): Promise<ServiceStatus> {
    const dockerStatus = await dockerLifecycle.getContainerStatus();
    const workerStatus = workerSpawner.getWorkerStatus();

    return {
      docker: {
        running: dockerStatus.length > 0,
        postgres: dockerStatus.some(c => c.name === 'postgres' && c.running),
        redis: dockerStatus.some(c => c.name === 'redis' && c.running),
      },
      workers: {
        running: workerStatus.running,
        pid: workerStatus.pid,
      },
      nextjs: {
        running: this.nextjsProcess !== null && !this.nextjsProcess.killed,
        pid: this.nextjsProcess?.pid,
        url: 'http://localhost:8347',
      },
    };
  }

  /**
   * Start Next.js development server
   */
  private async startNextjs(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Next.js server failed to start within timeout'));
      }, 60000); // 60 second timeout

      // Use bundled Node.js to run Next.js directly (no npm wrapper)
      const nextBin = path.join(this.appDir, 'node_modules', 'next', 'dist', 'bin', 'next');

      this.nextjsProcess = spawn(this.nodePath, [nextBin, 'dev', '-p', '8347'], {
        cwd: this.appDir,
        shell: false, // Direct execution, no shell wrapper
        env: { ...process.env, ...this.envVars },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      // Handle stdout
      if (this.nextjsProcess.stdout) {
        this.nextjsProcess.stdout.on('data', (data) => {
          const output = data.toString();
          logger.info(output, 'nextjs');

          // Check if server is ready
          if (output.includes('Ready') || output.includes('started server on')) {
            clearTimeout(timeout);
            resolve();
          }
        });
      }

      // Handle stderr
      if (this.nextjsProcess.stderr) {
        this.nextjsProcess.stderr.on('data', (data) => {
          const output = data.toString();
          logger.error(output, 'nextjs');
        });
      }

      // Handle process exit
      this.nextjsProcess.on('exit', (code, signal) => {
        logger.warn(`Next.js process exited with code ${code}, signal ${signal}`, 'nextjs');
        this.nextjsProcess = null;
      });

      // Handle process errors
      this.nextjsProcess.on('error', (error) => {
        clearTimeout(timeout);
        logger.error('Next.js process error', 'nextjs', { error: error.message });
        reject(error);
      });
    });
  }

  /**
   * Utility: sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

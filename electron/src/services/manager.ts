// Service Manager - Unified orchestrator for all services
// Manages Docker, BullMQ workers, and Next.js server lifecycle
//
// PHASE 4 ENHANCEMENTS:
// - HealthMonitor: Continuous health checking with adaptive polling
// - AutoRestarter: Automatic crash recovery with exponential backoff
// - ServiceGraph: Dependency-aware start/stop ordering
// - GracefulShutdown: Queue draining before termination

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { Notification } from 'electron';
import * as dockerLifecycle from '../docker/lifecycle';
import * as workerSpawner from '../workers/spawner';
import * as portChecker from './port-checker';
import logger from '../logger';
import { resolveNodePath, getNodeRuntimeInfo } from '../../../src/lib/runtime/node-resolver';
import { HealthMonitor } from './health-monitor';
import { AutoRestarter } from './auto-restart';
import { ServiceGraph } from './service-graph';
import { GracefulShutdown } from './graceful-shutdown';

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

  // Phase 4: Enhanced service monitoring and recovery
  public healthMonitor: HealthMonitor;
  private autoRestarter: AutoRestarter;
  private serviceGraph: ServiceGraph;
  private gracefulShutdown: GracefulShutdown;

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

    // Phase 4: Initialize enhanced service modules
    this.initializePhase4Modules();
  }

  /**
   * Initialize Phase 4 service monitoring and recovery modules
   */
  private initializePhase4Modules(): void {
    // SIMPLIFIED 3-NODE ARCHITECTURE:
    // - docker: PostgreSQL + Redis containers (started together by docker-compose)
    // - nextjs: Next.js server (includes DB migrations on startup)
    // - workers: BullMQ workers
    this.serviceGraph = new ServiceGraph({
      docker: { depends: [] },
      nextjs: { depends: ['docker'] },
      workers: { depends: ['nextjs'] },
    });

    this.healthMonitor = new HealthMonitor();
    this.autoRestarter = new AutoRestarter();
    this.gracefulShutdown = new GracefulShutdown();

    // Register services with auto-restarter
    this.autoRestarter.registerService('workers', async () => {
      await this.restartService('workers');
    });
    this.autoRestarter.registerService('nextjs', async () => {
      await this.restartService('nextjs');
    });
    this.autoRestarter.registerService('docker', async () => {
      await this.restartService('docker');
    });

    // Wire health events to auto-restart
    this.healthMonitor.on('health:service-down', (service: string) => {
      logger.warn(`Service ${service} is down, triggering auto-restart`, 'service-manager');
      this.autoRestarter.restart(service);
    });

    // CRITICAL: User notifications for auto-restart (cannot be silent)
    // Silent auto-restarts can mask serious problems - user MUST be informed
    this.autoRestarter.on('restart:starting', (service: string, state: any) => {
      new Notification({
        title: 'Service Restarting',
        body: `${service} crashed and is restarting automatically (attempt ${state.restartCount + 1})`,
        silent: false,
      }).show();
      logger.warn(`Auto-restarting ${service} (attempt ${state.restartCount + 1})`, 'service-manager');
    });

    this.autoRestarter.on('restart:success', (service: string) => {
      new Notification({
        title: 'Service Recovered',
        body: `${service} has been restarted successfully`,
        silent: false,
      }).show();
      logger.info(`Successfully restarted ${service}`, 'service-manager');
    });

    this.autoRestarter.on('restart:failed', (service: string, state: any, err: Error) => {
      new Notification({
        title: 'Restart Failed',
        body: `Failed to restart ${service}: ${err.message}`,
        silent: false,
      }).show();
      logger.error(`Failed to restart ${service}`, 'service-manager', { error: err.message });
    });

    this.autoRestarter.on('restart:rate-limited', (service: string) => {
      new Notification({
        title: 'Restart Rate Limit Exceeded',
        body: `${service} has crashed too many times. Manual intervention required.`,
        silent: false,
      }).show();
      logger.error(`Rate limit exceeded for ${service}`, 'service-manager');
    });

    logger.info('Phase 4 modules initialized (HealthMonitor, AutoRestarter, ServiceGraph, GracefulShutdown)', 'service-manager');
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
   * Start all services in sequence (Phase 4: Uses ServiceGraph for ordering)
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

      // Step 2: Start services in dependency order (Phase 4: ServiceGraph)
      const startOrder = this.serviceGraph.getStartOrder();
      logger.info(`Starting services in order: ${startOrder.join(' → ')}`, 'service-manager');

      for (const service of startOrder) {
        await this.startServiceByName(service);
      }

      // Step 3: Start background monitoring AFTER all services up (Phase 4)
      logger.info('Starting health monitoring...', 'service-manager');
      this.healthMonitor.start();

      logger.info('All services started successfully', 'service-manager');
    } catch (error: any) {
      logger.error('Failed to start services', 'service-manager', { error: error.message });
      throw error;
    }
  }

  /**
   * Start a specific service by name (Phase 4: ServiceGraph integration)
   */
  private async startServiceByName(serviceName: string): Promise<void> {
    switch (serviceName) {
      case 'docker':
        this.reportProgress('docker', 'in_progress', 'Starting Docker containers...');
        await dockerLifecycle.startDockerCompose(this.appDir);
        this.reportProgress('docker', 'completed', 'Docker containers started');

        // Wait for services to be healthy
        this.reportProgress('health', 'in_progress', 'Waiting for database and Redis...');
        await dockerLifecycle.waitForAllServices();
        this.reportProgress('health', 'completed', 'Database and Redis are ready');

        // Initialize database (if needed)
        this.reportProgress('database', 'in_progress', 'Initializing database schema...');
        await dockerLifecycle.initializeDatabase(this.appDir);
        this.reportProgress('database', 'completed', 'Database initialized');
        break;

      case 'nextjs':
        this.reportProgress('nextjs', 'in_progress', 'Starting Next.js server...');
        await this.startNextjs();
        this.reportProgress('nextjs', 'completed', 'Next.js server started at http://localhost:8347');
        break;

      case 'workers':
        this.reportProgress('workers', 'in_progress', 'Starting BullMQ workers...');
        workerSpawner.spawnWorkers(this.appDir, this.envVars, this.nodePath, (output) => {
          logger.info(output, 'workers');
        });
        this.reportProgress('workers', 'completed', 'BullMQ workers started');
        break;

      default:
        logger.warn(`Unknown service: ${serviceName}`, 'service-manager');
    }
  }

  /**
   * Stop all services gracefully (Phase 4: Uses ServiceGraph + GracefulShutdown)
   */
  async stopAll(): Promise<void> {
    try {
      logger.info('Stopping all services...', 'service-manager');

      // Stop monitoring first (Phase 4)
      this.healthMonitor.stop();

      // Stop services in reverse dependency order (Phase 4: ServiceGraph)
      const stopOrder = this.serviceGraph.getStopOrder();
      logger.info(`Stopping services in order: ${stopOrder.join(' → ')}`, 'service-manager');

      for (const service of stopOrder) {
        await this.stopServiceByName(service);
      }

      logger.info('All services stopped successfully', 'service-manager');
    } catch (error: any) {
      logger.error('Failed to stop services', 'service-manager', { error: error.message });
      throw error;
    }
  }

  /**
   * Stop a specific service by name (Phase 4: GracefulShutdown integration)
   */
  private async stopServiceByName(serviceName: string): Promise<void> {
    switch (serviceName) {
      case 'workers':
        logger.info('Stopping BullMQ workers gracefully...', 'service-manager');
        const workerProcess = workerSpawner.getWorkerProcess();
        await this.gracefulShutdown.shutdown({
          service: 'workers',
          process: workerProcess,
          timeout: 30000, // 30s timeout for queue draining
        });
        break;

      case 'nextjs':
        logger.info('Stopping Next.js server gracefully...', 'service-manager');
        await this.gracefulShutdown.shutdown({
          service: 'nextjs',
          process: this.nextjsProcess || undefined,
          timeout: 10000, // 10s timeout for in-flight requests
        });
        this.nextjsProcess = null;
        break;

      case 'docker':
        logger.info('Stopping Docker containers gracefully...', 'service-manager');
        await this.gracefulShutdown.shutdown({
          service: 'docker',
          timeout: 30000, // 30s timeout for docker-compose down
        });
        break;

      default:
        logger.warn(`Unknown service: ${serviceName}`, 'service-manager');
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

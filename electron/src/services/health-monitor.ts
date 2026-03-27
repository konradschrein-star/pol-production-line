/**
 * Health Monitor - Continuous service health checking with adaptive polling
 *
 * Monitors all critical services:
 * - Docker: Daemon running + containers + PostgreSQL/Redis connections
 * - Workers: Process alive (PID check)
 * - Next.js: HTTP health endpoint check
 *
 * Emits events on state transitions for auto-restart integration.
 */

import { EventEmitter } from 'events';
import { exec } from 'child_process';
import { promisify } from 'util';
import logger from '../logger';

const execPromise = promisify(exec);

export interface HealthStatus {
  service: string;
  healthy: boolean;
  lastCheck: Date;
  consecutiveFailures: number;
  details?: string;
}

export interface HealthCheckResult {
  healthy: boolean;
  details?: string;
}

export class HealthMonitor extends EventEmitter {
  private interval: NodeJS.Timeout | null = null;
  private status: Map<string, HealthStatus> = new Map();
  private pollInterval = 5000; // 5 seconds default
  private readonly minPollInterval = 2000; // 2s when recovering
  private readonly maxPollInterval = 15000; // 15s when stable
  private readonly normalPollInterval = 5000; // 5s normal

  /**
   * Start continuous health monitoring
   */
  start(): void {
    if (this.interval) {
      logger.warn('HealthMonitor already running', 'health-monitor');
      return;
    }

    logger.info('Starting continuous health checks', 'health-monitor');

    this.interval = setInterval(() => {
      this.checkAllServices();
    }, this.pollInterval);

    // Immediate first check
    this.checkAllServices();
  }

  /**
   * Stop health monitoring
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      logger.info('Stopped health monitoring', 'health-monitor');
    }
  }

  /**
   * Check all services in parallel
   */
  private async checkAllServices(): Promise<void> {
    await Promise.all([
      this.checkDocker(),
      this.checkWorkers(),
      this.checkNextjs(),
    ]);

    // Adaptive polling: Faster if any service unhealthy
    this.adjustPollInterval();
  }

  /**
   * Adjust polling interval based on service health
   * - 2s when any service unhealthy (fast recovery detection)
   * - 5s normal operation
   * - 15s when all stable for >5 minutes
   */
  private adjustPollInterval(): void {
    const statuses = Array.from(this.status.values());
    const anyUnhealthy = statuses.some(s => !s.healthy);

    if (anyUnhealthy) {
      this.pollInterval = this.minPollInterval;
    } else {
      // Check if all services have been stable for 5+ minutes
      const allStableLongTerm = statuses.every(s => {
        const timeSinceCheck = Date.now() - s.lastCheck.getTime();
        return s.healthy && timeSinceCheck > 300000; // 5 minutes
      });

      this.pollInterval = allStableLongTerm ? this.maxPollInterval : this.normalPollInterval;
    }
  }

  /**
   * Check Docker daemon + containers + service connections
   * Three-tier check:
   * 1. Docker daemon running (docker info)
   * 2. Containers running (docker ps)
   * 3. Services accepting connections (pg_isready, redis-cli ping)
   */
  private async checkDocker(): Promise<void> {
    try {
      // Step 1: Verify Docker daemon is running
      await execPromise('docker info', { timeout: 3000 });

      // Step 2: Check containers are running
      const { stdout } = await execPromise(
        'docker ps --filter "name=obsidian" --format "{{.Names}}"',
        { timeout: 3000 }
      );

      const containers = stdout.trim().split('\n').filter(Boolean);
      const postgresRunning = containers.some(c => c.toLowerCase().includes('postgres'));
      const redisRunning = containers.some(c => c.toLowerCase().includes('redis'));

      if (!postgresRunning || !redisRunning) {
        this.updateStatus('docker', false, `Missing containers (Postgres: ${postgresRunning}, Redis: ${redisRunning})`);
        return;
      }

      // Step 3: Verify services are accepting connections
      const postgresHealthy = await this.checkPostgresConnection(containers.find(c => c.toLowerCase().includes('postgres'))!);
      const redisHealthy = await this.checkRedisConnection(containers.find(c => c.toLowerCase().includes('redis'))!);

      const allHealthy = postgresHealthy && redisHealthy;
      this.updateStatus(
        'docker',
        allHealthy,
        `Postgres: ${postgresHealthy ? '✓' : '✗'}, Redis: ${redisHealthy ? '✓' : '✗'}`
      );
    } catch (err: any) {
      this.updateStatus('docker', false, `Docker daemon not running: ${err.message}`);
    }
  }

  /**
   * Check PostgreSQL connection via pg_isready
   */
  private async checkPostgresConnection(containerName: string): Promise<boolean> {
    try {
      await execPromise(`docker exec ${containerName} pg_isready -U postgres`, { timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check Redis connection via redis-cli PING
   */
  private async checkRedisConnection(containerName: string): Promise<boolean> {
    try {
      const { stdout } = await execPromise(`docker exec ${containerName} redis-cli ping`, { timeout: 2000 });
      return stdout.trim().toUpperCase() === 'PONG';
    } catch {
      return false;
    }
  }

  /**
   * Check workers process via PID
   */
  private async checkWorkers(): Promise<void> {
    // Get worker PID from spawner module
    const workerPid = (global as any).workerProcess?.pid;

    if (!workerPid) {
      this.updateStatus('workers', false, 'Process not started');
      return;
    }

    try {
      // Signal 0 checks if process exists (cross-platform)
      process.kill(workerPid, 0);
      this.updateStatus('workers', true, `PID ${workerPid} alive`);
    } catch (err) {
      this.updateStatus('workers', false, `PID ${workerPid} not found`);
    }
  }

  /**
   * Check Next.js via HTTP health endpoint
   */
  private async checkNextjs(): Promise<void> {
    try {
      // Use native fetch (Node 18+)
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);

      const response = await fetch('http://localhost:8347/api/health', {
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const healthy = response.ok;
      const body = await response.json().catch(() => ({}));

      this.updateStatus(
        'nextjs',
        healthy,
        healthy ? `HTTP ${response.status}` : `HTTP ${response.status} - ${body.status || 'error'}`
      );
    } catch (err: any) {
      const message = err.name === 'AbortError' ? 'Timeout' : err.message;
      this.updateStatus('nextjs', false, message);
    }
  }

  /**
   * Update service health status and emit events on transitions
   */
  private updateStatus(service: string, healthy: boolean, details?: string): void {
    const prev = this.status.get(service);
    const consecutiveFailures = healthy ? 0 : (prev?.consecutiveFailures || 0) + 1;

    const newStatus: HealthStatus = {
      service,
      healthy,
      lastCheck: new Date(),
      consecutiveFailures,
      details,
    };

    this.status.set(service, newStatus);

    // Emit events on state transitions
    if (prev && prev.healthy && !healthy) {
      logger.warn(`${service} became unhealthy: ${details}`, 'health-monitor');
      this.emit('health:service-down', service, newStatus);
    } else if (prev && !prev.healthy && healthy) {
      logger.info(`${service} recovered`, 'health-monitor');
      this.emit('health:service-up', service, newStatus);
    }

    // Emit degraded event if multiple consecutive failures
    if (consecutiveFailures >= 3 && consecutiveFailures % 3 === 0) {
      logger.error(`${service} degraded (${consecutiveFailures} consecutive failures)`, 'health-monitor');
      this.emit('health:degraded', service, newStatus);
    }
  }

  /**
   * Get health status for a specific service
   */
  getStatus(service: string): HealthStatus | undefined {
    return this.status.get(service);
  }

  /**
   * Get all service statuses
   */
  getAllStatus(): HealthStatus[] {
    return Array.from(this.status.values());
  }

  /**
   * Check if all services are healthy
   */
  isAllHealthy(): boolean {
    return Array.from(this.status.values()).every(s => s.healthy);
  }
}

// Docker Compose lifecycle management

import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

export interface ContainerStatus {
  name: string;
  running: boolean;
  healthy: boolean;
}

/**
 * Start Docker Compose services (Postgres + Redis)
 */
export async function startDockerCompose(
  appDir: string,
  onProgress?: (message: string) => void
): Promise<void> {
  const composePath = path.join(appDir, 'docker-compose.yml');

  try {
    onProgress?.('Starting Docker containers...');

    // Start containers in detached mode
    await execAsync('docker-compose up -d', {
      cwd: appDir,
      timeout: 120000, // 2 minutes
    });

    onProgress?.('Docker containers started');
  } catch (error: any) {
    throw new Error(`Failed to start Docker containers: ${error.message}`);
  }
}

/**
 * Stop Docker Compose services
 */
export async function stopDockerCompose(
  appDir: string,
  onProgress?: (message: string) => void
): Promise<void> {
  try {
    onProgress?.('Stopping Docker containers...');

    await execAsync('docker-compose down', {
      cwd: appDir,
      timeout: 60000, // 1 minute
    });

    onProgress?.('Docker containers stopped');
  } catch (error: any) {
    throw new Error(`Failed to stop Docker containers: ${error.message}`);
  }
}

/**
 * Pull Docker images without starting containers
 */
export async function pullDockerImages(
  appDir: string,
  onProgress?: (message: string) => void
): Promise<void> {
  try {
    onProgress?.('Pulling Docker image: postgres:16-alpine...');

    // Pull postgres image
    await execAsync('docker pull postgres:16-alpine', {
      timeout: 300000, // 5 minutes
    });

    onProgress?.('Pulling Docker image: redis:7-alpine...');

    // Pull redis image
    await execAsync('docker pull redis:7-alpine', {
      timeout: 300000, // 5 minutes
    });

    onProgress?.('Docker images pulled successfully');
  } catch (error: any) {
    throw new Error(`Failed to pull Docker images: ${error.message}`);
  }
}

/**
 * Wait for PostgreSQL to be ready
 */
export async function waitForPostgres(maxWaitTime: number = 30000): Promise<void> {
  const startTime = Date.now();
  const checkInterval = 1000; // 1 second

  while (Date.now() - startTime < maxWaitTime) {
    try {
      // Use docker exec to run pg_isready
      await execAsync('docker exec obsidian-postgres pg_isready -U obsidian', {
        timeout: 5000,
      });
      return; // Success!
    } catch (error) {
      // Not ready yet, wait and retry
      await sleep(checkInterval);
    }
  }

  throw new Error('PostgreSQL failed to become ready within timeout');
}

/**
 * Wait for Redis to be ready
 */
export async function waitForRedis(maxWaitTime: number = 30000): Promise<void> {
  const startTime = Date.now();
  const checkInterval = 1000; // 1 second

  while (Date.now() - startTime < maxWaitTime) {
    try {
      // Use docker exec to run redis-cli ping
      const { stdout } = await execAsync(
        'docker exec obsidian-redis redis-cli -a obsidian_redis_password ping',
        { timeout: 5000 }
      );

      if (stdout.trim() === 'PONG') {
        return; // Success!
      }
    } catch (error) {
      // Not ready yet, wait and retry
      await sleep(checkInterval);
    }
  }

  throw new Error('Redis failed to become ready within timeout');
}

/**
 * Wait for all services (Postgres + Redis) to be ready
 */
export async function waitForAllServices(
  onProgress?: (message: string) => void
): Promise<void> {
  try {
    onProgress?.('Waiting for PostgreSQL to be ready...');
    await waitForPostgres();

    onProgress?.('PostgreSQL is ready');
    onProgress?.('Waiting for Redis to be ready...');

    await waitForRedis();

    onProgress?.('Redis is ready');
    onProgress?.('All services are ready!');
  } catch (error: any) {
    throw new Error(`Failed to wait for services: ${error.message}`);
  }
}

/**
 * Get status of Docker containers
 */
export async function getContainerStatus(): Promise<ContainerStatus[]> {
  try {
    const { stdout } = await execAsync(
      'docker ps --filter "name=obsidian-" --format "{{.Names}}\t{{.Status}}"',
      { timeout: 5000 }
    );

    const containers: ContainerStatus[] = [];

    if (stdout.trim()) {
      const lines = stdout.trim().split('\n');

      for (const line of lines) {
        const [name, status] = line.split('\t');
        containers.push({
          name: name.replace('obsidian-', ''),
          running: status.startsWith('Up'),
          healthy: status.includes('healthy') || !status.includes('unhealthy'),
        });
      }
    }

    return containers;
  } catch (error) {
    return [];
  }
}

/**
 * Check if specific container is running
 */
export async function isContainerRunning(containerName: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync(
      `docker ps --filter "name=${containerName}" --format "{{.Names}}"`,
      { timeout: 5000 }
    );

    return stdout.trim() === containerName;
  } catch (error) {
    return false;
  }
}

/**
 * Initialize database schema
 */
export async function initializeDatabase(
  appDir: string,
  onProgress?: (message: string) => void
): Promise<void> {
  try {
    onProgress?.('Initializing database schema...');

    // The schema is automatically initialized via docker-compose.yml
    // which mounts schema.sql to /docker-entrypoint-initdb.d/
    // Just verify the database is accessible

    await execAsync(
      'docker exec obsidian-postgres psql -U obsidian -d obsidian_news -c "SELECT 1"',
      { timeout: 10000 }
    );

    onProgress?.('Database schema initialized');
  } catch (error: any) {
    throw new Error(`Failed to initialize database: ${error.message}`);
  }
}

/**
 * Get container logs
 */
export async function getContainerLogs(
  containerName: string,
  lines: number = 50
): Promise<string> {
  try {
    const { stdout } = await execAsync(
      `docker logs --tail ${lines} obsidian-${containerName}`,
      { timeout: 10000 }
    );

    return stdout;
  } catch (error: any) {
    return `Error fetching logs: ${error.message}`;
  }
}

/**
 * Restart a specific container
 */
export async function restartContainer(containerName: string): Promise<void> {
  try {
    await execAsync(`docker restart obsidian-${containerName}`, {
      timeout: 30000,
    });
  } catch (error: any) {
    throw new Error(`Failed to restart ${containerName}: ${error.message}`);
  }
}

/**
 * Remove all containers and volumes (clean uninstall)
 */
export async function removeAllContainers(
  appDir: string,
  removeVolumes: boolean = false
): Promise<void> {
  try {
    const command = removeVolumes
      ? 'docker-compose down -v' // Remove volumes too
      : 'docker-compose down';

    await execAsync(command, {
      cwd: appDir,
      timeout: 60000,
    });
  } catch (error: any) {
    throw new Error(`Failed to remove containers: ${error.message}`);
  }
}

/**
 * Utility function to sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

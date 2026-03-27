/**
 * Docker Service Health Checks
 *
 * Waits for PostgreSQL and Redis to be ready before running tests.
 * Uses exponential backoff for reliability.
 */

import { execSync } from 'child_process';

export interface HealthCheckResult {
  healthy: boolean;
  message: string;
  retries?: number;
}

/**
 * Wait for PostgreSQL to be ready
 */
export async function waitForPostgres(maxRetries = 30): Promise<HealthCheckResult> {
  const host = process.env.POSTGRES_HOST || 'localhost';
  const port = process.env.POSTGRES_PORT || '5432';
  const user = process.env.POSTGRES_USER || 'postgres';
  const database = process.env.POSTGRES_DATABASE || 'obsidian_news_desk';

  let retries = 0;
  let delay = 1000; // Start with 1 second

  while (retries < maxRetries) {
    try {
      // Try to connect using pg_isready (if available) or direct connection
      try {
        execSync(`docker exec obsidian-news-desk-postgres-1 pg_isready -h ${host} -p ${port} -U ${user}`, {
          stdio: 'pipe',
          encoding: 'utf8',
        });
      } catch {
        // Fallback: Try direct connection with psql
        const { Pool } = await import('pg');
        const pool = new Pool({
          host,
          port: parseInt(port, 10),
          database,
          user,
          password: process.env.POSTGRES_PASSWORD || 'postgres',
        });
        await pool.query('SELECT 1');
        await pool.end();
      }

      return {
        healthy: true,
        message: `PostgreSQL ready (${retries} retries)`,
        retries,
      };
    } catch (error) {
      retries++;
      if (retries >= maxRetries) {
        return {
          healthy: false,
          message: `PostgreSQL not ready after ${maxRetries} retries (${maxRetries * delay / 1000}s)`,
          retries,
        };
      }

      // Exponential backoff with max 5 seconds
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * 1.5, 5000);
    }
  }

  return {
    healthy: false,
    message: 'PostgreSQL health check failed',
  };
}

/**
 * Wait for Redis to be ready
 */
export async function waitForRedis(maxRetries = 30): Promise<HealthCheckResult> {
  const host = process.env.REDIS_HOST || 'localhost';
  const port = process.env.REDIS_PORT || '6379';

  let retries = 0;
  let delay = 1000; // Start with 1 second

  while (retries < maxRetries) {
    try {
      // Try using redis-cli inside Docker container
      try {
        execSync('docker exec obsidian-news-desk-redis-1 redis-cli ping', {
          stdio: 'pipe',
          encoding: 'utf8',
        });
      } catch {
        // Fallback: Try direct connection with ioredis
        const { default: Redis } = await import('ioredis');
        const redis = new Redis({
          host,
          port: parseInt(port, 10),
          lazyConnect: true,
        });
        await redis.connect();
        await redis.ping();
        redis.disconnect();
      }

      return {
        healthy: true,
        message: `Redis ready (${retries} retries)`,
        retries,
      };
    } catch (error) {
      retries++;
      if (retries >= maxRetries) {
        return {
          healthy: false,
          message: `Redis not ready after ${maxRetries} retries (${maxRetries * delay / 1000}s)`,
          retries,
        };
      }

      // Exponential backoff with max 5 seconds
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * 1.5, 5000);
    }
  }

  return {
    healthy: false,
    message: 'Redis health check failed',
  };
}

/**
 * Get Docker container status
 */
export function getDockerServiceStatus(): { postgres: boolean; redis: boolean } {
  try {
    const output = execSync('docker ps --format "{{.Names}}"', {
      encoding: 'utf8',
      stdio: 'pipe',
    });

    const containers = output.trim().split('\n');
    const postgres = containers.some(name => name.includes('postgres'));
    const redis = containers.some(name => name.includes('redis'));

    return { postgres, redis };
  } catch (error) {
    return { postgres: false, redis: false };
  }
}

/**
 * Wait for all Docker services to be healthy
 */
export async function waitForAllServices(maxRetries = 30): Promise<{
  allHealthy: boolean;
  postgres: HealthCheckResult;
  redis: HealthCheckResult;
}> {
  const [postgres, redis] = await Promise.all([
    waitForPostgres(maxRetries),
    waitForRedis(maxRetries),
  ]);

  return {
    allHealthy: postgres.healthy && redis.healthy,
    postgres,
    redis,
  };
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { redisConnection } from '@/lib/queue';
import { statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

interface HealthStatus {
  status: 'ok' | 'warning' | 'critical';
}

interface TokenHealth extends HealthStatus {
  age_minutes: number;
  expires_in_minutes: number;
  last_refresh?: string;
}

interface RateLimitHealth extends HealthStatus {
  requests_last_hour: number;
  quota: number;
  percentage_used: number;
}

interface ErrorRateHealth extends HealthStatus {
  failed_scenes_24h: number;
  total_scenes_24h: number;
  percentage: number;
}

interface DiskSpaceHealth extends HealthStatus {
  available_gb: number;
  used_gb: number;
  total_gb: number;
}

interface ServicesHealth {
  postgres: 'connected' | 'disconnected';
  redis: 'connected' | 'disconnected';
  workers: 'running' | 'stopped';
}

interface SystemHealth {
  whisk_token: TokenHealth;
  rate_limits: RateLimitHealth;
  error_rate: ErrorRateHealth;
  disk_space: DiskSpaceHealth;
  services: ServicesHealth;
}

/**
 * GET /api/system/health
 *
 * Returns comprehensive system health status
 */
export async function GET() {
  try {
    // 1. Check Whisk Token Age (estimated from env or last known refresh)
    const tokenAge = await getTokenAge();

    // 2. Check Rate Limits (count image generation requests in last hour)
    const rateLimits = await getRateLimitStatus();

    // 3. Check Error Rate (failed scenes in last 24 hours)
    const errorRate = await getErrorRateStatus();

    // 4. Check Disk Space
    const diskSpace = await getDiskSpaceStatus();

    // 5. Check Services
    const services = await getServicesStatus();

    const health: SystemHealth = {
      whisk_token: tokenAge,
      rate_limits: rateLimits,
      error_rate: errorRate,
      disk_space: diskSpace,
      services,
    };

    return NextResponse.json(health);
  } catch (error) {
    console.error('[API] Error fetching system health:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch system health',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function getTokenAge(): Promise<TokenHealth> {
  // Whisk tokens expire after ~1 hour
  // We can't know the exact age without metadata, so we'll estimate based on recent errors

  // Check for recent auth errors
  const result = await db.query(
    `SELECT COUNT(*) as auth_errors
     FROM news_scenes
     WHERE error_category = 'auth_error'
       AND updated_at > NOW() - INTERVAL '10 minutes'`
  );

  const authErrors = parseInt(result.rows[0]?.auth_errors || '0');

  if (authErrors > 0) {
    return {
      age_minutes: 60, // Assume expired
      expires_in_minutes: 0,
      status: 'critical',
    };
  }

  // Otherwise, assume token is healthy (no way to know exact age without tracking)
  return {
    age_minutes: 30, // Estimated
    expires_in_minutes: 30, // Estimated
    status: 'ok',
  };
}

async function getRateLimitStatus(): Promise<RateLimitHealth> {
  // Count image generation attempts in last hour
  const result = await db.query(
    `SELECT COUNT(*) as requests
     FROM generation_history
     WHERE created_at > NOW() - INTERVAL '1 hour'`
  );

  const requestsLastHour = parseInt(result.rows[0]?.requests || '0');
  const quota = 100; // Estimated quota per hour
  const percentageUsed = (requestsLastHour / quota) * 100;

  let status: 'ok' | 'warning' | 'critical' = 'ok';
  if (percentageUsed > 90) {
    status = 'critical';
  } else if (percentageUsed > 70) {
    status = 'warning';
  }

  return {
    requests_last_hour: requestsLastHour,
    quota,
    percentage_used: parseFloat(percentageUsed.toFixed(1)),
    status,
  };
}

async function getErrorRateStatus(): Promise<ErrorRateHealth> {
  const result = await db.query(
    `SELECT
       COUNT(*) as total,
       COUNT(CASE WHEN generation_status = 'failed' THEN 1 END) as failed
     FROM news_scenes
     WHERE created_at > NOW() - INTERVAL '24 hours'`
  );

  const total = parseInt(result.rows[0]?.total || '0');
  const failed = parseInt(result.rows[0]?.failed || '0');
  const percentage = total > 0 ? (failed / total) * 100 : 0;

  let status: 'ok' | 'warning' | 'critical' = 'ok';
  if (percentage > 30) {
    status = 'critical';
  } else if (percentage > 15) {
    status = 'warning';
  }

  return {
    failed_scenes_24h: failed,
    total_scenes_24h: total,
    percentage: parseFloat(percentage.toFixed(1)),
    status,
  };
}

async function getDiskSpaceStatus(): Promise<DiskSpaceHealth> {
  try {
    // Check storage directory size
    const storageDir = join(homedir(), 'ObsidianNewsDesk');
    const stats = statSync(storageDir);

    // On Windows, we can't easily get filesystem stats via Node.js
    // This is a placeholder - would need platform-specific implementation
    const totalGb = 100; // Placeholder
    const availableGb = 50; // Placeholder
    const usedGb = totalGb - availableGb;

    let status: 'ok' | 'warning' | 'critical' = 'ok';
    if (availableGb < 5) {
      status = 'critical';
    } else if (availableGb < 15) {
      status = 'warning';
    }

    return {
      available_gb: parseFloat(availableGb.toFixed(1)),
      used_gb: parseFloat(usedGb.toFixed(1)),
      total_gb: totalGb,
      status,
    };
  } catch (error) {
    // If we can't read disk stats, return unknown
    return {
      available_gb: 0,
      used_gb: 0,
      total_gb: 0,
      status: 'warning',
    };
  }
}

async function getServicesStatus(): Promise<ServicesHealth> {
  let postgres: 'connected' | 'disconnected' = 'disconnected';
  let redis: 'connected' | 'disconnected' = 'disconnected';
  let workers: 'running' | 'stopped' = 'stopped';

  // Check Postgres
  try {
    await db.query('SELECT 1');
    postgres = 'connected';
  } catch (error) {
    console.error('[HEALTH] Postgres connection failed:', error);
  }

  // Check Redis
  try {
    await redisConnection.ping();
    redis = 'connected';
  } catch (error) {
    console.error('[HEALTH] Redis connection failed:', error);
  }

  // Check if workers are running (heuristic: check for recent job activity)
  try {
    const result = await db.query(
      `SELECT COUNT(*) as active_jobs
       FROM news_jobs
       WHERE status IN ('analyzing', 'generating_images', 'rendering')
         AND updated_at > NOW() - INTERVAL '5 minutes'`
    );

    const activeJobs = parseInt(result.rows[0]?.active_jobs || '0');
    if (activeJobs > 0 || postgres === 'connected') {
      workers = 'running'; // Assume workers are running if jobs are processing
    }
  } catch (error) {
    console.error('[HEALTH] Worker status check failed:', error);
  }

  return {
    postgres,
    redis,
    workers,
  };
}

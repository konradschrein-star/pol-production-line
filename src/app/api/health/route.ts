import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { redisConnection } from '@/lib/queue';

/**
 * Health Check Endpoint
 *
 * Returns the health status of the application and its critical dependencies.
 * Used by container orchestrators, load balancers, and monitoring systems.
 *
 * Response Format:
 * - status: "healthy" | "degraded" | "unhealthy"
 * - services: Object containing health of each dependency
 * - timestamp: ISO 8601 timestamp of the check
 * - uptime: Process uptime in seconds
 */

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    database: 'healthy' | 'error';
    redis: 'healthy' | 'error';
  };
  timestamp: string;
  uptime: number;
}

export async function GET() {
  const startTime = Date.now();

  const health: HealthStatus = {
    status: 'healthy',
    services: {
      database: 'error',
      redis: 'error',
    },
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };

  // Test database connection
  try {
    await db.query('SELECT 1');
    health.services.database = 'healthy';
  } catch (error) {
    console.error('❌ Health check - Database error:', error);
    health.services.database = 'error';
    health.status = 'degraded';
  }

  // Test Redis connection
  try {
    const pong = await redisConnection.ping();
    if (pong === 'PONG') {
      health.services.redis = 'healthy';
    } else {
      throw new Error('Redis ping did not return PONG');
    }
  } catch (error) {
    console.error('❌ Health check - Redis error:', error);
    health.services.redis = 'error';
    health.status = 'degraded';
  }

  // If both services are down, mark as unhealthy
  if (health.services.database === 'error' && health.services.redis === 'error') {
    health.status = 'unhealthy';
  }

  const responseTime = Date.now() - startTime;

  // Log health check results
  if (health.status !== 'healthy') {
    console.warn(`⚠️ Health check ${health.status} - DB: ${health.services.database}, Redis: ${health.services.redis} (${responseTime}ms)`);
  }

  // Return appropriate HTTP status code
  const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

  return NextResponse.json(health, { status: statusCode });
}

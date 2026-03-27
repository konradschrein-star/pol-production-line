/**
 * Rate Limiter Middleware
 *
 * Production-grade rate limiting using Redis for distributed systems.
 * Prevents API abuse and ensures fair resource allocation.
 *
 * MODULAR DESIGN: Configurable limits per endpoint, reusable across routes
 *
 * @module rate-limiter
 */

import { NextRequest, NextResponse } from 'next/server';
import Redis from 'ioredis';

// Redis client for rate limiting (separate from queue system)
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: 1, // Use separate database from BullMQ (which uses db 0)
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 3) return null; // Stop retrying after 3 attempts
    return Math.min(times * 200, 1000); // Exponential backoff
  },
});

redis.on('error', (err) => {
  console.error('❌ [RateLimiter] Redis connection error:', err);
});

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  windowMs: number;     // Time window in milliseconds
  maxRequests: number;  // Max requests per window
  keyPrefix?: string;   // Redis key prefix (default: 'ratelimit:')
}

/**
 * Default rate limit configs for different endpoint types
 */
export const RATE_LIMITS = {
  // Standard API endpoints
  default: {
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 100,         // 100 requests/minute
  },

  // Resource-intensive operations
  heavy: {
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 10,          // 10 requests/minute
  },

  // Critical operations (job creation, analysis)
  critical: {
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 20,          // 20 requests/minute
  },

  // Health checks and monitoring
  monitoring: {
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 300,         // 300 requests/minute
  },
} as const;

/**
 * Get client identifier from request
 * Uses IP address by default, but can be extended to use API keys, user IDs, etc.
 */
function getClientId(req: NextRequest): string {
  // Try to get real IP from headers (for proxies/load balancers)
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');

  const ip = forwarded?.split(',')[0].trim() || realIp || 'unknown';

  return `ip:${ip}`;
}

/**
 * Check rate limit for a request
 *
 * @param req - Next.js request
 * @param config - Rate limit configuration
 * @returns Response if rate limited, null if allowed
 */
export async function checkRateLimit(
  req: NextRequest,
  config: RateLimitConfig = RATE_LIMITS.default
): Promise<NextResponse | null> {
  try {
    const clientId = getClientId(req);
    const keyPrefix = config.keyPrefix || 'ratelimit:';
    const key = `${keyPrefix}${clientId}`;

    // Get current count
    const current = await redis.get(key);
    const count = current ? parseInt(current) : 0;

    if (count >= config.maxRequests) {
      // Rate limit exceeded
      const ttl = await redis.pttl(key);
      const retryAfter = Math.ceil(ttl / 1000); // Convert to seconds

      console.warn(`⚠️  [RateLimiter] Rate limit exceeded for ${clientId}: ${count}/${config.maxRequests}`);

      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `Too many requests. Please try again in ${retryAfter} seconds.`,
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + ttl).toISOString(),
          },
        }
      );
    }

    // Increment counter
    const newCount = await redis.incr(key);

    // Set expiry on first request
    if (newCount === 1) {
      await redis.pexpire(key, config.windowMs);
    }

    // Add rate limit headers to response (will be added by caller)
    const remaining = Math.max(0, config.maxRequests - newCount);

    // Store rate limit info in request for later use
    (req as any).rateLimit = {
      limit: config.maxRequests,
      remaining,
      reset: new Date(Date.now() + (await redis.pttl(key))),
    };

    return null; // Not rate limited
  } catch (error) {
    console.error('❌ [RateLimiter] Error checking rate limit:', error);

    // On Redis error, fail open (allow request) to prevent outage
    // But log error for monitoring
    return null;
  }
}

/**
 * Create rate limit middleware for specific config
 *
 * @param config - Rate limit configuration
 * @returns Middleware function
 */
export function createRateLimiter(config: RateLimitConfig = RATE_LIMITS.default) {
  return async (req: NextRequest): Promise<NextResponse | null> => {
    return checkRateLimit(req, config);
  };
}

/**
 * Add rate limit headers to response
 *
 * @param response - Next.js response
 * @param req - Next.js request (with rateLimit info)
 * @returns Response with headers added
 */
export function addRateLimitHeaders(
  response: NextResponse,
  req: NextRequest
): NextResponse {
  const rateLimitInfo = (req as any).rateLimit;

  if (rateLimitInfo) {
    response.headers.set('X-RateLimit-Limit', rateLimitInfo.limit.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimitInfo.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitInfo.reset.toISOString());
  }

  return response;
}

/**
 * Shutdown rate limiter (for graceful shutdown)
 */
export async function shutdownRateLimiter(): Promise<void> {
  await redis.quit();
  console.log('✅ [RateLimiter] Redis connection closed');
}

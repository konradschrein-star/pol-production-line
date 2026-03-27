/**
 * Next.js Middleware - Rate Limiting & Security
 *
 * PRODUCTION HARDENING Phase 2:
 * - In-memory rate limiting per IP + endpoint
 * - Automatic cleanup of expired rate limit records
 * - Configurable limits per endpoint pattern
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/middleware
 */

import { NextRequest, NextResponse } from 'next/server';

// ===== RATE LIMIT CONFIGURATION =====

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory rate limit storage
// NOTE: Resets on server restart. For multi-instance production, use Redis.
const rateLimitMap = new Map<string, RateLimitRecord>();

// Rate limit configurations per endpoint pattern
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Job creation (POST) - Allow 10 jobs per minute per IP
  // GET requests are handled separately with higher limit
  '/api/jobs': {
    maxRequests: 10,
    windowMs: 60000, // 1 minute
  },

  // Avatar compilation - Heavy operation, limit to 5 per 5 minutes
  '/api/jobs/*/compile': {
    maxRequests: 5,
    windowMs: 300000, // 5 minutes
  },

  // Scene regeneration - Allow 20 per minute (users may regenerate multiple scenes)
  '/api/jobs/*/scenes/*/regenerate': {
    maxRequests: 20,
    windowMs: 60000, // 1 minute
  },

  // Image upload - Limit to 30 per minute
  '/api/jobs/*/scenes/*/upload': {
    maxRequests: 30,
    windowMs: 60000, // 1 minute
  },

  // Bulk operations - Limit to 10 per minute (can affect many jobs)
  '/api/jobs/bulk': {
    maxRequests: 10,
    windowMs: 60000, // 1 minute
  },

  // Default for all other API routes
  '/api/*': {
    maxRequests: 100,
    windowMs: 60000, // 1 minute
  },
};

/**
 * Match request pathname against rate limit pattern
 * Supports wildcards (*)
 *
 * @param pathname - Request pathname
 * @returns Matched pattern or null
 */
function matchPattern(pathname: string): string | null {
  // Sort patterns by specificity (more specific patterns first)
  const patterns = Object.keys(RATE_LIMITS).sort((a, b) => {
    const aWildcards = (a.match(/\*/g) || []).length;
    const bWildcards = (b.match(/\*/g) || []).length;
    return aWildcards - bWildcards; // Fewer wildcards = more specific
  });

  for (const pattern of patterns) {
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '[^/]+').replace(/\//g, '\\/') + '$'
    );

    if (regex.test(pathname)) {
      return pattern;
    }
  }

  return null;
}

/**
 * Check rate limit for IP + endpoint combination
 *
 * @param ip - Client IP address
 * @param pattern - Matched endpoint pattern
 * @returns true if request allowed, false if rate limited
 */
function checkRateLimit(ip: string, pattern: string): boolean {
  const config = RATE_LIMITS[pattern];
  if (!config) return true; // No limit configured

  const now = Date.now();
  const key = `${ip}:${pattern}`;
  const record = rateLimitMap.get(key);

  // First request or window expired
  if (!record || now > record.resetAt) {
    rateLimitMap.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return true;
  }

  // Check if limit exceeded
  if (record.count >= config.maxRequests) {
    return false; // Rate limited
  }

  // Increment count
  record.count++;
  return true;
}

/**
 * Cleanup expired rate limit records
 * Runs periodically to prevent memory leaks
 */
function cleanupExpiredRecords(): void {
  const now = Date.now();
  let cleaned = 0;

  // Convert to array to avoid iterator issues with older TypeScript targets
  const entries = Array.from(rateLimitMap.entries());
  for (const [key, record] of entries) {
    if (now > record.resetAt) {
      rateLimitMap.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`[RATE LIMIT] Cleaned up ${cleaned} expired records`);
  }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredRecords, 5 * 60 * 1000);
}

// ===== MIDDLEWARE HANDLER =====

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Skip rate limiting for non-API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Skip rate limiting for GET requests (read operations for live updates)
  // This allows auto-refresh polling without hitting rate limits
  if (req.method === 'GET') {
    return NextResponse.next();
  }

  // Get client IP (supports various proxy headers)
  const ip =
    req.ip ||
    req.headers.get('x-forwarded-for')?.split(',')[0] ||
    req.headers.get('x-real-ip') ||
    'unknown';

  // Match request against rate limit patterns
  const pattern = matchPattern(pathname);

  if (pattern) {
    const allowed = checkRateLimit(ip, pattern);

    if (!allowed) {
      console.warn(`[RATE LIMIT] Blocked request from ${ip} to ${pathname}`);

      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil(RATE_LIMITS[pattern].windowMs / 1000), // seconds
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(RATE_LIMITS[pattern].windowMs / 1000)),
          },
        }
      );
    }
  }

  return NextResponse.next();
}

/**
 * Matcher configuration - which routes this middleware applies to
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

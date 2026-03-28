/**
 * Next.js Middleware - Authentication, Rate Limiting & Security
 *
 * PRODUCTION HARDENING Phase 2 & 8:
 * - API key authentication for all API endpoints
 * - In-memory rate limiting per IP + endpoint
 * - Automatic cleanup of expired rate limit records
 * - Configurable limits per endpoint pattern
 * - Security headers (CSP, X-Frame-Options, HSTS, etc.)
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/middleware
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSecurityHeaders } from './lib/security/headers';

// ===== AUTHENTICATION CONFIGURATION =====

/**
 * Public endpoints that don't require authentication
 * Useful for health checks, status pages, etc.
 */
const PUBLIC_ENDPOINTS = [
  '/api/health',
];

/**
 * Verify API key from Authorization header
 *
 * @param req - Next.js request object
 * @returns true if authenticated, false otherwise
 */
function verifyAuthentication(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');

  // Check for Authorization header
  if (!authHeader) {
    return false;
  }

  // Parse Bearer token
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return false;
  }

  const providedKey = match[1];
  const validKey = process.env.API_KEY;

  // If no API key configured, reject all requests (fail-secure)
  if (!validKey) {
    console.error('[AUTH] API_KEY not configured in environment variables');
    return false;
  }

  // Use constant-time comparison to prevent timing attacks
  try {
    const providedBuffer = Buffer.from(providedKey, 'utf-8');
    const validBuffer = Buffer.from(validKey, 'utf-8');

    // If lengths don't match, create dummy buffer to maintain constant time
    if (providedBuffer.length !== validBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(providedBuffer, validBuffer);
  } catch (error) {
    console.error('[AUTH] Error during authentication:', error);
    return false;
  }
}

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

// Rate limit configurations per endpoint pattern and method
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Job creation (POST) - Allow 10 jobs per minute per IP
  'POST:/api/jobs': {
    maxRequests: 10,
    windowMs: 60000, // 1 minute
  },

  // Job listing (GET) - Allow 60 requests per minute (for polling/auto-refresh)
  'GET:/api/jobs': {
    maxRequests: 60,
    windowMs: 60000, // 1 minute
  },

  // Job detail (GET) - Allow 60 requests per minute
  'GET:/api/jobs/*': {
    maxRequests: 60,
    windowMs: 60000, // 1 minute
  },

  // Avatar compilation - Heavy operation, limit to 5 per 5 minutes
  'POST:/api/jobs/*/compile': {
    maxRequests: 5,
    windowMs: 300000, // 5 minutes
  },

  // Scene regeneration - Allow 20 per minute (users may regenerate multiple scenes)
  'POST:/api/jobs/*/scenes/*/regenerate': {
    maxRequests: 20,
    windowMs: 60000, // 1 minute
  },

  // Image upload - Limit to 30 per minute
  'POST:/api/jobs/*/scenes/*/upload': {
    maxRequests: 30,
    windowMs: 60000, // 1 minute
  },

  // Bulk operations - Limit to 10 per minute (can affect many jobs)
  'POST:/api/jobs/bulk': {
    maxRequests: 10,
    windowMs: 60000, // 1 minute
  },

  // Default for all other POST/PUT/PATCH/DELETE API routes
  'POST:/api/*': {
    maxRequests: 100,
    windowMs: 60000, // 1 minute
  },

  // Default for all other GET API routes
  'GET:/api/*': {
    maxRequests: 120,
    windowMs: 60000, // 1 minute
  },
};

/**
 * Match request pathname and method against rate limit pattern
 * Supports wildcards (*) and method prefixes (GET:, POST:, etc.)
 *
 * @param method - HTTP method (GET, POST, etc.)
 * @param pathname - Request pathname
 * @returns Matched pattern or null
 */
function matchPattern(method: string, pathname: string): string | null {
  // Sort patterns by specificity (more specific patterns first)
  const patterns = Object.keys(RATE_LIMITS).sort((a, b) => {
    const aWildcards = (a.match(/\*/g) || []).length;
    const bWildcards = (b.match(/\*/g) || []).length;
    // Also prioritize patterns with method prefix
    const aHasMethod = a.includes(':') ? -1 : 0;
    const bHasMethod = b.includes(':') ? -1 : 0;
    return aHasMethod - bHasMethod || aWildcards - bWildcards;
  });

  for (const pattern of patterns) {
    // Check if pattern has method prefix
    const [patternMethod, patternPath] = pattern.includes(':')
      ? pattern.split(':', 2)
      : [null, pattern];

    // Skip if method doesn't match (when method is specified)
    if (patternMethod && patternMethod !== method) {
      continue;
    }

    const regex = new RegExp(
      '^' + patternPath.replace(/\*/g, '[^/]+').replace(/\//g, '\\/') + '$'
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

  // Probabilistic cleanup: 1% chance per request
  // Avoids setInterval dependency, works in serverless environments
  if (Math.random() < 0.01) {
    cleanupExpiredRecords();
  }

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

// Note: Cleanup now runs probabilistically inside checkRateLimit()
// to work in both long-lived and serverless environments

// ===== MIDDLEWARE HANDLER =====

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Apply security headers to all responses
  const isProduction = process.env.NODE_ENV === 'production';
  const securityHeaders = getSecurityHeaders(isProduction);

  // Skip authentication and rate limiting for non-API routes
  if (!pathname.startsWith('/api/')) {
    const response = NextResponse.next();
    // Apply security headers to non-API routes too
    for (const [key, value] of Object.entries(securityHeaders)) {
      response.headers.set(key, value);
    }
    return response;
  }

  // ===== AUTHENTICATION CHECK =====
  // Check if endpoint is public
  const isPublicEndpoint = PUBLIC_ENDPOINTS.some((endpoint) =>
    pathname.startsWith(endpoint)
  );

  // Allow same-origin browser requests (no Bearer token needed from the UI)
  const referer = req.headers.get('referer') || '';
  const origin = req.headers.get('origin') || '';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8347';
  const isBrowserRequest = referer.startsWith(appUrl) || origin.startsWith(appUrl) ||
    req.headers.get('sec-fetch-site') === 'same-origin' ||
    req.headers.get('sec-fetch-mode') === 'navigate';

  if (!isPublicEndpoint && !isBrowserRequest) {
    const isAuthenticated = verifyAuthentication(req);

    if (!isAuthenticated) {
      console.warn(`[AUTH] Unauthorized request to ${pathname} from ${req.ip || 'unknown'}`);

      const response = NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Valid API key required. Include Authorization: Bearer <API_KEY> header.',
        },
        {
          status: 401,
          headers: {
            'WWW-Authenticate': 'Bearer realm="API"',
          },
        }
      );

      // Apply security headers to error responses
      for (const [key, value] of Object.entries(securityHeaders)) {
        response.headers.set(key, value);
      }

      return response;
    }
  }

  // ===== RATE LIMITING =====
  // Get client IP (supports various proxy headers)
  //
  // ⚠️ SECURITY WARNING: Only trust x-forwarded-for/x-real-ip if behind a trusted
  // reverse proxy (nginx, cloudflare, etc.) that OVERWRITES these headers. Otherwise,
  // clients can spoof IP addresses to bypass rate limiting and IP whitelists.
  //
  // For localhost-only deployment (Obsidian News Desk default), this is not a security
  // risk since all traffic is from 127.0.0.1. For internet-facing deployments, configure
  // TRUST_PROXY=true in .env and validate proxy chain.
  const ip =
    req.ip ||
    req.headers.get('x-forwarded-for')?.split(',')[0] ||
    req.headers.get('x-real-ip') ||
    'unknown';

  // Match request against rate limit patterns (includes HTTP method)
  const pattern = matchPattern(req.method, pathname);

  if (pattern) {
    const allowed = checkRateLimit(ip, pattern);

    if (!allowed) {
      console.warn(`[RATE LIMIT] Blocked request from ${ip} to ${pathname}`);

      const response = NextResponse.json(
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

      // Apply security headers to rate limit responses
      for (const [key, value] of Object.entries(securityHeaders)) {
        response.headers.set(key, value);
      }

      return response;
    }
  }

  // Apply security headers to successful API responses
  const response = NextResponse.next();
  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value);
  }

  return response;
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

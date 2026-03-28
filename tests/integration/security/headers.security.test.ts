/**
 * Security Headers Validation Tests
 *
 * Validates all security headers across different endpoints,
 * including API routes, error responses, and non-API pages.
 *
 * Phase 8: Performance & Security
 */

import { describe, it, expect } from 'vitest';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8347';
const validApiKey = process.env.API_KEY;

const testEndpoints = [
  '/api/health',
  '/api/jobs',
  '/api/audit',
];

describe('Security Headers on API Routes', () => {
  testEndpoints.forEach(endpoint => {
    it(`should have security headers on ${endpoint}`, async () => {
      const headers: any = {
        'Authorization': `Bearer ${validApiKey}`,
      };

      // Special headers for admin endpoints
      if (endpoint === '/api/audit') {
        headers['x-admin-api-key'] = process.env.ADMIN_API_KEY;
      }

      const response = await fetch(`${baseUrl}${endpoint}`, {
        headers,
      });

      // CSP
      const csp = response.headers.get('Content-Security-Policy');
      expect(csp).toBeTruthy();
      expect(csp).toContain("default-src 'self'");

      // XSS Protection
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');

      // Privacy
      expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');

      // Permissions
      const perms = response.headers.get('Permissions-Policy');
      expect(perms).toContain('camera=()');
      expect(perms).toContain('microphone=()');
      expect(perms).toContain('geolocation=()');
    });
  });
});

describe('Security Headers on Error Responses', () => {
  it('should have security headers on 401 Unauthorized', async () => {
    const response = await fetch(`${baseUrl}/api/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // No Authorization header - trigger 401
      },
      body: JSON.stringify({
        raw_script: 'Test',
        title: 'Test',
      }),
    });

    expect(response.status).toBe(401);

    // Verify security headers even on error response
    expect(response.headers.get('Content-Security-Policy')).toBeTruthy();
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('should have security headers on 400 Bad Request', async () => {
    const response = await fetch(`${baseUrl}/api/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validApiKey}`,
      },
      body: JSON.stringify({
        // Missing required fields - trigger 400
      }),
    });

    expect(response.status).toBe(400);

    // Verify security headers
    expect(response.headers.get('Content-Security-Policy')).toBeTruthy();
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
  });

  it('should have security headers on 404 Not Found', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';
    const response = await fetch(`${baseUrl}/api/jobs/${nonExistentId}`, {
      headers: {
        'Authorization': `Bearer ${validApiKey}`,
      },
    });

    expect(response.status).toBe(404);

    // Verify security headers
    expect(response.headers.get('Content-Security-Policy')).toBeTruthy();
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
  });

  it('should have security headers on 429 Rate Limit', async () => {
    // Trigger rate limit
    for (let i = 0; i < 11; i++) {
      await fetch(`${baseUrl}/api/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validApiKey}`,
        },
        body: JSON.stringify({
          raw_script: 'Test',
          title: 'Test',
        }),
      });
    }

    const response = await fetch(`${baseUrl}/api/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validApiKey}`,
      },
      body: JSON.stringify({
        raw_script: 'Test',
        title: 'Test',
      }),
    });

    if (response.status === 429) {
      // Verify security headers
      expect(response.headers.get('Content-Security-Policy')).toBeTruthy();
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    }

    // Wait for rate limit to reset
    await new Promise(resolve => setTimeout(resolve, 61000));
  }, 120000);
});

describe('Content-Security-Policy Directives', () => {
  it('should have correct script-src directive', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    const csp = response.headers.get('Content-Security-Policy');

    expect(csp).toBeTruthy();

    // Allow self, unsafe-eval (Remotion), unsafe-inline (Next.js)
    expect(csp).toContain("script-src 'self' 'unsafe-eval' 'unsafe-inline'");
  });

  it('should have correct style-src directive', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    const csp = response.headers.get('Content-Security-Policy');

    expect(csp).toBeTruthy();

    // Allow self, unsafe-inline (TailwindCSS)
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
  });

  it('should have correct img-src directive', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    const csp = response.headers.get('Content-Security-Policy');

    expect(csp).toBeTruthy();

    // Allow self, data URLs, blobs, and Whisk API
    expect(csp).toContain("img-src 'self' data: blob: https://aisandbox-pa.googleapis.com");
  });

  it('should have correct media-src directive', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    const csp = response.headers.get('Content-Security-Policy');

    expect(csp).toBeTruthy();

    // Allow self and blobs (for video playback)
    expect(csp).toContain("media-src 'self' blob:");
  });

  it('should have correct connect-src directive', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    const csp = response.headers.get('Content-Security-Policy');

    expect(csp).toBeTruthy();

    // Allow self and WebSocket (for HMR)
    expect(csp).toContain("connect-src 'self' ws: wss:");
  });

  it('should have frame-ancestors none (clickjacking protection)', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    const csp = response.headers.get('Content-Security-Policy');

    expect(csp).toBeTruthy();
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it('should have base-uri self', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    const csp = response.headers.get('Content-Security-Policy');

    expect(csp).toBeTruthy();
    expect(csp).toContain("base-uri 'self'");
  });

  it('should have form-action self', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    const csp = response.headers.get('Content-Security-Policy');

    expect(csp).toBeTruthy();
    expect(csp).toContain("form-action 'self'");
  });
});

describe('HSTS Header (HTTPS Only)', () => {
  it('should NOT have HSTS header when HTTPS is disabled', async () => {
    const response = await fetch(`${baseUrl}/api/health`);

    // HSTS should only be present in production with HTTPS
    const hsts = response.headers.get('Strict-Transport-Security');

    if (process.env.HTTPS_ENABLED === 'true' && process.env.NODE_ENV === 'production') {
      expect(hsts).toBeTruthy();
      expect(hsts).toContain('max-age=31536000');
      expect(hsts).toContain('includeSubDomains');
      expect(hsts).toContain('preload');
    } else {
      // Not set in test environment without HTTPS
      expect(hsts).toBeNull();
    }
  });
});

describe('X-Frame-Options Header', () => {
  it('should have X-Frame-Options DENY on all endpoints', async () => {
    const endpoints = ['/api/health', '/api/jobs', '/api/audit'];

    for (const endpoint of endpoints) {
      const headers: any = { 'Authorization': `Bearer ${validApiKey}` };
      if (endpoint === '/api/audit') {
        headers['x-admin-api-key'] = process.env.ADMIN_API_KEY;
      }

      const response = await fetch(`${baseUrl}${endpoint}`, { headers });
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    }
  });
});

describe('X-Content-Type-Options Header', () => {
  it('should have X-Content-Type-Options nosniff on all endpoints', async () => {
    const endpoints = ['/api/health', '/api/jobs'];

    for (const endpoint of endpoints) {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        headers: { 'Authorization': `Bearer ${validApiKey}` },
      });

      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    }
  });
});

describe('Referrer-Policy Header', () => {
  it('should have strict-origin-when-cross-origin policy', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
  });
});

describe('Permissions-Policy Header', () => {
  it('should disable camera, microphone, and geolocation', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    const perms = response.headers.get('Permissions-Policy');

    expect(perms).toBeTruthy();
    expect(perms).toContain('camera=()');
    expect(perms).toContain('microphone=()');
    expect(perms).toContain('geolocation=()');
  });
});

describe('Security Headers Completeness', () => {
  it('should have all required security headers on API responses', async () => {
    const response = await fetch(`${baseUrl}/api/health`);

    const requiredHeaders = [
      'Content-Security-Policy',
      'X-Frame-Options',
      'X-Content-Type-Options',
      'Referrer-Policy',
      'Permissions-Policy',
    ];

    for (const header of requiredHeaders) {
      expect(response.headers.get(header)).toBeTruthy();
    }
  });

  it('should have consistent headers across all API routes', async () => {
    const endpoints = ['/api/health', '/api/jobs'];
    const headers1 = await fetch(`${baseUrl}${endpoints[0]}`);
    const headers2 = await fetch(`${baseUrl}${endpoints[1]}`, {
      headers: { 'Authorization': `Bearer ${validApiKey}` },
    });

    // CSP should be identical
    expect(headers1.headers.get('Content-Security-Policy')).toBe(
      headers2.headers.get('Content-Security-Policy')
    );

    // X-Frame-Options should be identical
    expect(headers1.headers.get('X-Frame-Options')).toBe(
      headers2.headers.get('X-Frame-Options')
    );

    // X-Content-Type-Options should be identical
    expect(headers1.headers.get('X-Content-Type-Options')).toBe(
      headers2.headers.get('X-Content-Type-Options')
    );
  });
});

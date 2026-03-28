/**
 * Injection Prevention Security Tests
 *
 * Validates SQL injection prevention, XSS handling,
 * and CSP header enforcement.
 *
 * Phase 8: Performance & Security
 */

import { describe, it, expect } from 'vitest';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8347';
const validApiKey = process.env.API_KEY;

describe('SQL Injection Prevention', () => {
  it('should reject malicious job ID in GET /api/jobs/[id]', async () => {
    const maliciousId = "'; DROP TABLE news_jobs; --";
    const response = await fetch(
      `${baseUrl}/api/jobs/${encodeURIComponent(maliciousId)}`,
      {
        headers: {
          'Authorization': `Bearer ${validApiKey}`,
        },
      }
    );

    // Should return 400 (invalid UUID) or 404 (not found)
    // Should NOT execute SQL injection
    expect([400, 404]).toContain(response.status);
  });

  it('should sanitize search query in GET /api/jobs?search=', async () => {
    const maliciousSearch = "'; DROP TABLE news_jobs; --";
    const response = await fetch(
      `${baseUrl}/api/jobs?search=${encodeURIComponent(maliciousSearch)}`,
      {
        headers: {
          'Authorization': `Bearer ${validApiKey}`,
        },
      }
    );

    // Should return 200 with empty results (safe search)
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.jobs).toBeDefined();
    expect(Array.isArray(data.jobs)).toBe(true);
  });

  it('should use parameterized queries for all database operations', async () => {
    // Create a job with special characters that would break string concatenation
    const specialChars = "Test' OR '1'='1";
    const response = await fetch(`${baseUrl}/api/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validApiKey}`,
      },
      body: JSON.stringify({
        raw_script: specialChars,
        title: "SQL Injection Test",
      }),
    });

    // Should succeed without breaking
    expect(response.status).toBe(201);
    const job = await response.json();
    expect(job.raw_script).toBe(specialChars);

    // Clean up
    await fetch(`${baseUrl}/api/jobs/${job.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${validApiKey}`,
      },
    });
  });

  it('should prevent SQL injection in bulk operations', async () => {
    const maliciousJobId = "' OR '1'='1";
    const response = await fetch(`${baseUrl}/api/jobs/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validApiKey}`,
      },
      body: JSON.stringify({
        action: 'delete',
        jobIds: [maliciousJobId], // Invalid UUID format
      }),
    });

    // Should reject due to Zod validation (invalid UUID)
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Validation error');
  });
});

describe('XSS Prevention', () => {
  it('should store XSS payloads as-is in raw_script field', async () => {
    const xssScript = '<script>alert("XSS")</script>';
    const response = await fetch(`${baseUrl}/api/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validApiKey}`,
      },
      body: JSON.stringify({
        raw_script: xssScript,
        title: 'XSS Test Job',
      }),
    });

    expect(response.status).toBe(201);
    const job = await response.json();

    // Backend stores as-is (no escaping)
    // Frontend React components will auto-escape
    expect(job.raw_script).toBe(xssScript);

    // Clean up
    await fetch(`${baseUrl}/api/jobs/${job.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${validApiKey}`,
      },
    });
  });

  it('should store HTML entities in ticker_headline', async () => {
    const htmlEntities = '<div>&lt;script&gt;alert("XSS")&lt;/script&gt;</div>';
    const response = await fetch(`${baseUrl}/api/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validApiKey}`,
      },
      body: JSON.stringify({
        raw_script: 'Test script with ticker',
        title: 'Ticker Test',
      }),
    });

    expect(response.status).toBe(201);
    const job = await response.json();

    // Update scene ticker headline
    const sceneId = job.scenes?.[0]?.id;
    if (sceneId) {
      const updateResponse = await fetch(
        `${baseUrl}/api/jobs/${job.id}/scenes/${sceneId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${validApiKey}`,
          },
          body: JSON.stringify({
            ticker_headline: htmlEntities,
          }),
        }
      );

      // Should succeed (backend stores as-is)
      expect(updateResponse.status).toBe(200);
    }

    // Clean up
    await fetch(`${baseUrl}/api/jobs/${job.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${validApiKey}`,
      },
    });
  });

  it('should have CSP header to prevent inline script execution', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    const csp = response.headers.get('Content-Security-Policy');

    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it('should have all security headers present', async () => {
    const response = await fetch(`${baseUrl}/api/health`);

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

describe('CSP Header Validation', () => {
  it('should allow necessary exceptions for Remotion and Next.js', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    const csp = response.headers.get('Content-Security-Policy');

    expect(csp).toBeTruthy();

    // Remotion requires 'unsafe-eval'
    expect(csp).toContain("script-src 'self' 'unsafe-eval' 'unsafe-inline'");

    // TailwindCSS requires 'unsafe-inline' styles
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");

    // Whisk images
    expect(csp).toContain('https://aisandbox-pa.googleapis.com');

    // WebSocket for HMR
    expect(csp).toContain('ws: wss:');
  });

  it('should prevent dangerous directives', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    const csp = response.headers.get('Content-Security-Policy');

    expect(csp).toBeTruthy();

    // Should not allow 'unsafe-eval' globally (only for script-src)
    expect(csp).not.toContain("default-src 'self' 'unsafe-eval'");

    // Should enforce frame-ancestors 'none' (clickjacking protection)
    expect(csp).toContain("frame-ancestors 'none'");

    // Should restrict base-uri
    expect(csp).toContain("base-uri 'self'");

    // Should restrict form-action
    expect(csp).toContain("form-action 'self'");
  });
});

describe('UUID Validation', () => {
  it('should reject non-UUID values in route parameters', async () => {
    const invalidIds = [
      '123',
      'not-a-uuid',
      '../../../etc/passwd',
      '00000000-0000-0000-0000-000000000000', // Valid UUID but likely not found
    ];

    for (const invalidId of invalidIds) {
      const response = await fetch(`${baseUrl}/api/jobs/${invalidId}`, {
        headers: {
          'Authorization': `Bearer ${validApiKey}`,
        },
      });

      // Should return 400 (invalid format) or 404 (not found)
      expect([400, 404]).toContain(response.status);
    }
  });
});

describe('Input Sanitization', () => {
  it('should handle null bytes in input', async () => {
    const nullByteInput = 'Test\x00Null';
    const response = await fetch(`${baseUrl}/api/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validApiKey}`,
      },
      body: JSON.stringify({
        raw_script: nullByteInput,
        title: 'Null Byte Test',
      }),
    });

    // Should either accept (stripping null bytes) or reject
    expect([201, 400]).toContain(response.status);

    if (response.status === 201) {
      const job = await response.json();
      // Clean up
      await fetch(`${baseUrl}/api/jobs/${job.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${validApiKey}`,
        },
      });
    }
  });

  it('should handle extremely long input strings', async () => {
    const longString = 'A'.repeat(100000); // 100KB string
    const response = await fetch(`${baseUrl}/api/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validApiKey}`,
      },
      body: JSON.stringify({
        raw_script: longString,
        title: 'Long String Test',
      }),
    });

    // Should reject due to Zod validation (max 50000 chars)
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Validation error');
  });
});

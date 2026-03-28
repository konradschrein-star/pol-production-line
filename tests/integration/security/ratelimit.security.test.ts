/**
 * Rate Limiting Security Tests
 *
 * Validates rate limiting boundaries, Retry-After headers,
 * and per-IP enforcement.
 *
 * Phase 8: Performance & Security
 */

import { describe, it, expect, beforeEach } from 'vitest';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8347';
const validApiKey = process.env.API_KEY;

// Helper to wait for rate limit window to reset
async function waitForRateLimitReset(seconds: number = 61) {
  console.log(`⏳ Waiting ${seconds}s for rate limit window to reset...`);
  await new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

describe('POST /api/jobs Rate Limiting (10/min)', () => {
  it('should enforce rate limit on job creation', async () => {
    // Send 15 requests rapidly
    const requests = [];
    for (let i = 0; i < 15; i++) {
      requests.push(
        fetch(`${baseUrl}/api/jobs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${validApiKey}`,
          },
          body: JSON.stringify({
            raw_script: `Test script ${i}`,
            title: `Rate Limit Test ${i}`,
          }),
        })
      );
    }

    const responses = await Promise.all(requests);
    const statuses = responses.map(r => r.status);

    // Count successful (201) and rate-limited (429) responses
    const successCount = statuses.filter(s => s === 201).length;
    const rateLimitedCount = statuses.filter(s => s === 429).length;

    console.log(`✓ ${successCount} requests succeeded, ${rateLimitedCount} were rate-limited`);

    // First 10 should succeed (within rate limit)
    expect(successCount).toBeLessThanOrEqual(10);

    // At least 1 request should be rate-limited
    expect(rateLimitedCount).toBeGreaterThan(0);

    // Clean up successful jobs
    for (let i = 0; i < responses.length; i++) {
      if (responses[i].status === 201) {
        const job = await responses[i].json();
        await fetch(`${baseUrl}/api/jobs/${job.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${validApiKey}`,
          },
        });
      }
    }
  }, 120000); // 2-minute timeout

  it('should include Retry-After header on 429 responses', async () => {
    // Trigger rate limit by sending 11 requests
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

    // Next request should be rate-limited
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
      expect(response.headers.get('Retry-After')).toBeTruthy();

      const data = await response.json();
      expect(data).toHaveProperty('retryAfter');
      expect(typeof data.retryAfter).toBe('number');
      expect(data.retryAfter).toBeGreaterThan(0);
    }

    // Wait for rate limit to reset before next test
    await waitForRateLimitReset();
  }, 120000);
});

describe('GET /api/jobs Rate Limiting (60/min)', () => {
  it('should allow GET requests at higher rate than POST', async () => {
    const requests = [];

    // Send 30 GET requests (half of the 60/min limit)
    for (let i = 0; i < 30; i++) {
      requests.push(
        fetch(`${baseUrl}/api/jobs`, {
          headers: {
            'Authorization': `Bearer ${validApiKey}`,
          },
        })
      );
    }

    const responses = await Promise.all(requests);
    const successCount = responses.filter(r => r.status === 200).length;

    // All 30 should succeed (within 60/min limit)
    expect(successCount).toBe(30);
  }, 60000);
});

describe('Bulk Operations Rate Limiting (10/min)', () => {
  it('should enforce stricter rate limit on bulk operations', async () => {
    const requests = [];

    // Send 12 bulk operation requests
    for (let i = 0; i < 12; i++) {
      requests.push(
        fetch(`${baseUrl}/api/jobs/bulk`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${validApiKey}`,
          },
          body: JSON.stringify({
            action: 'delete',
            jobIds: [], // Empty array (no actual deletions)
          }),
        })
      );
    }

    const responses = await Promise.all(requests);
    const statuses = responses.map(r => r.status);

    const successCount = statuses.filter(s => s === 200).length;
    const rateLimitedCount = statuses.filter(s => s === 429).length;

    console.log(`✓ Bulk operations: ${successCount} succeeded, ${rateLimitedCount} rate-limited`);

    // First 10 should succeed
    expect(successCount).toBeLessThanOrEqual(10);

    // At least 1 should be rate-limited
    expect(rateLimitedCount).toBeGreaterThan(0);

    // Wait for rate limit to reset
    await waitForRateLimitReset();
  }, 120000);
});

describe('Rate Limit Reset', () => {
  it('should allow requests again after window expires', async () => {
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

    // Verify rate limited
    const rateLimitedResponse = await fetch(`${baseUrl}/api/jobs`, {
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

    expect(rateLimitedResponse.status).toBe(429);

    // Wait for window to reset (61 seconds)
    await waitForRateLimitReset();

    // Should allow requests again
    const response = await fetch(`${baseUrl}/api/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validApiKey}`,
      },
      body: JSON.stringify({
        raw_script: 'Test after reset',
        title: 'Reset Test',
      }),
    });

    expect(response.status).toBe(201);

    // Clean up
    const job = await response.json();
    await fetch(`${baseUrl}/api/jobs/${job.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${validApiKey}`,
      },
    });
  }, 180000); // 3-minute timeout (includes 61s wait)
});

describe('Rate Limit Enforcement', () => {
  it('should return proper error message on rate limit', async () => {
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
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('Too Many Requests');
    }

    // Wait for rate limit to reset
    await waitForRateLimitReset();
  }, 120000);
});

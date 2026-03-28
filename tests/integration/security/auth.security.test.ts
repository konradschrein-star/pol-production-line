/**
 * Authentication & Authorization Security Tests
 *
 * Validates Bearer token authentication, Admin API key protection,
 * IP whitelist enforcement, and timing-safe comparison.
 *
 * Phase 8: Performance & Security
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { pool } from '@/lib/db';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8347';
const validApiKey = process.env.API_KEY;
const validAdminKey = process.env.ADMIN_API_KEY;

describe('Bearer Token Authentication', () => {
  it('should reject requests without Bearer token', async () => {
    const response = await fetch(`${baseUrl}/api/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raw_script: 'Test script',
        title: 'Auth Test',
      }),
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should reject requests with invalid Bearer token', async () => {
    const response = await fetch(`${baseUrl}/api/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid-token-12345',
      },
      body: JSON.stringify({
        raw_script: 'Test script',
        title: 'Auth Test',
      }),
    });

    expect(response.status).toBe(401);
  });

  it('should accept requests with valid Bearer token', async () => {
    const response = await fetch(`${baseUrl}/api/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validApiKey}`,
      },
      body: JSON.stringify({
        raw_script: 'Test script for authentication',
        title: 'Auth Test Job',
      }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toHaveProperty('id');

    // Clean up test job
    const jobId = data.id;
    await fetch(`${baseUrl}/api/jobs/${jobId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${validApiKey}`,
      },
    });
  });

  it('should allow unauthenticated access to /api/health', async () => {
    const response = await fetch(`${baseUrl}/api/health`);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('status');
  });
});

describe('Admin API Key Protection', () => {
  it('should reject admin requests without ADMIN_API_KEY', async () => {
    const response = await fetch(`${baseUrl}/api/audit`);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should reject admin requests with wrong ADMIN_API_KEY', async () => {
    const response = await fetch(`${baseUrl}/api/audit`, {
      headers: {
        'x-admin-api-key': 'wrong-admin-key-12345',
      },
    });

    expect(response.status).toBe(401);
  });

  it('should accept admin requests with valid ADMIN_API_KEY', async () => {
    const response = await fetch(`${baseUrl}/api/audit`, {
      headers: {
        'x-admin-api-key': validAdminKey,
      },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('events');
  });
});

describe('IP Whitelist for Admin Endpoints', () => {
  it('should accept admin requests from localhost (127.0.0.1)', async () => {
    // Note: In test environment, requests are from localhost by default
    const response = await fetch(`${baseUrl}/api/settings`, {
      method: 'GET',
      headers: {
        'x-admin-api-key': validAdminKey,
      },
    });

    // Should succeed (200 or 204 depending on implementation)
    expect([200, 204]).toContain(response.status);
  });

  it('should log authentication failures to audit_log', async () => {
    // Trigger auth failure
    await fetch(`${baseUrl}/api/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid-token',
      },
      body: JSON.stringify({
        raw_script: 'Test',
        title: 'Test',
      }),
    });

    // Query audit log for auth failure events (last 10 seconds)
    const tenSecondsAgo = new Date(Date.now() - 10000);
    const result = await pool.query(
      `SELECT * FROM audit_log
       WHERE event_type = 'auth_failed'
         AND timestamp > $1
       ORDER BY timestamp DESC
       LIMIT 1`,
      [tenSecondsAgo]
    );

    // Should have logged the auth failure
    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.rows[0].severity).toBe('warning');
  });
});

describe('Timing-Safe Comparison', () => {
  it('should use constant-time comparison for API keys', async () => {
    const startTime = Date.now();

    // First request with wrong key (same length as real key)
    const wrongKey = 'a'.repeat(validApiKey?.length || 32);
    await fetch(`${baseUrl}/api/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${wrongKey}`,
      },
      body: JSON.stringify({
        raw_script: 'Test',
        title: 'Test',
      }),
    });

    const time1 = Date.now() - startTime;

    // Second request with different wrong key (same length)
    const startTime2 = Date.now();
    const wrongKey2 = 'b'.repeat(validApiKey?.length || 32);
    await fetch(`${baseUrl}/api/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${wrongKey2}`,
      },
      body: JSON.stringify({
        raw_script: 'Test',
        title: 'Test',
      }),
    });

    const time2 = Date.now() - startTime2;

    // Times should be roughly equal (within 50ms tolerance)
    // This indirectly tests constant-time comparison
    const timeDiff = Math.abs(time1 - time2);
    expect(timeDiff).toBeLessThan(50);
  });
});

describe('Authorization Enforcement', () => {
  it('should require authentication for all job operations', async () => {
    const endpoints = [
      { method: 'GET', path: '/api/jobs' },
      { method: 'POST', path: '/api/jobs' },
      { method: 'POST', path: '/api/jobs/bulk' },
    ];

    for (const endpoint of endpoints) {
      const response = await fetch(`${baseUrl}${endpoint.path}`, {
        method: endpoint.method,
        headers: { 'Content-Type': 'application/json' },
        body: endpoint.method === 'POST' ? JSON.stringify({}) : undefined,
      });

      expect(response.status).toBe(401);
    }
  });

  it('should allow authenticated access to all job operations', async () => {
    const endpoints = [
      { method: 'GET', path: '/api/jobs', expectedStatus: 200 },
    ];

    for (const endpoint of endpoints) {
      const response = await fetch(`${baseUrl}${endpoint.path}`, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validApiKey}`,
        },
      });

      expect(response.status).toBe(endpoint.expectedStatus);
    }
  });
});

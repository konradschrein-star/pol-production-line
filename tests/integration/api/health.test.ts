/**
 * Health Check API Integration Test
 *
 * Simple smoke test for system health.
 */

import { describe, it, expect } from 'vitest';

describe('GET /api/health', () => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8347';

  it('should return healthy status', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('status', 'healthy');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('uptime');
  });

  it('should have valid timestamp format', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    const data = await response.json();

    const timestamp = new Date(data.timestamp);
    expect(timestamp).toBeInstanceOf(Date);
    expect(timestamp.getTime()).toBeGreaterThan(0);
  });
});

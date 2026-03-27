/**
 * Analytics API Integration Tests
 *
 * Tests for /api/analytics endpoint.
 */

import { describe, it, expect, beforeAll } from 'vitest';

describe('GET /api/analytics', () => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8347';

  it('should return analytics data', async () => {
    const response = await fetch(`${baseUrl}/api/analytics`);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('totalJobs');
    expect(data).toHaveProperty('completedJobs');
    expect(data).toHaveProperty('failedJobs');
    expect(data).toHaveProperty('pendingJobs');
    expect(data).toHaveProperty('successRate');
    expect(data).toHaveProperty('jobsByStatus');
    expect(Array.isArray(data.jobsByStatus)).toBe(true);
  });

  it('should have valid numeric metrics', async () => {
    const response = await fetch(`${baseUrl}/api/analytics`);
    const data = await response.json();

    expect(typeof data.totalJobs).toBe('number');
    expect(typeof data.completedJobs).toBe('number');
    expect(typeof data.failedJobs).toBe('number');
    expect(typeof data.pendingJobs).toBe('number');
    expect(typeof data.successRate).toBe('number');
    expect(data.successRate).toBeGreaterThanOrEqual(0);
    expect(data.successRate).toBeLessThanOrEqual(100);
  });

  it('should include image generation stats if available', async () => {
    const response = await fetch(`${baseUrl}/api/analytics`);
    const data = await response.json();

    if (data.imageGenerationStats) {
      expect(data.imageGenerationStats).toHaveProperty('totalAttempts');
      expect(data.imageGenerationStats).toHaveProperty('successfulAttempts');
      expect(data.imageGenerationStats).toHaveProperty('avgGenerationTime');
      expect(data.imageGenerationStats).toHaveProperty('successRate');
    }
  });
});

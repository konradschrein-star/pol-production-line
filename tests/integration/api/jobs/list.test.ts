/**
 * API Test: GET /api/jobs (Job Listing & Filtering)
 *
 * Tests job listing endpoint with pagination, filtering, sorting
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestJob, deleteTestJob } from '../../../utils/db-helpers';

describe('GET /api/jobs - Job Listing', () => {
  let testJobIds: string[] = [];

  beforeAll(async () => {
    // Create test jobs with different statuses
    const jobs = await Promise.all([
      createTestJob({ title: 'Test Job 1', status: 'pending' }),
      createTestJob({ title: 'Test Job 2', status: 'analyzing' }),
      createTestJob({ title: 'Test Job 3', status: 'completed' }),
      createTestJob({ title: 'Test Job 4', status: 'pending' }),
      createTestJob({ title: 'Test Job 5', status: 'failed' }),
    ]);
    testJobIds = jobs.map((j) => j.id);
  });

  afterAll(async () => {
    for (const jobId of testJobIds) {
      await deleteTestJob(jobId);
    }
  });

  it('should fetch all jobs (default pagination)', async () => {
    const response = await fetch('http://localhost:8347/api/jobs');

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.jobs).toBeDefined();
    expect(Array.isArray(data.jobs)).toBe(true);
    expect(data.jobs.length).toBeGreaterThanOrEqual(5);
  });

  it('should filter by status (pending)', async () => {
    const response = await fetch('http://localhost:8347/api/jobs?status=pending');

    expect(response.status).toBe(200);
    const data = await response.json();
    data.jobs.forEach((job: any) => {
      expect(job.status).toBe('pending');
    });
  });

  it('should filter by status (completed)', async () => {
    const response = await fetch('http://localhost:8347/api/jobs?status=completed');

    expect(response.status).toBe(200);
    const data = await response.json();
    data.jobs.forEach((job: any) => {
      expect(job.status).toBe('completed');
    });
  });

  it('should sort by created_at descending (default)', async () => {
    const response = await fetch('http://localhost:8347/api/jobs?sort=created_at&order=desc');

    expect(response.status).toBe(200);
    const data = await response.json();

    // Verify descending order
    for (let i = 0; i < data.jobs.length - 1; i++) {
      const current = new Date(data.jobs[i].created_at).getTime();
      const next = new Date(data.jobs[i + 1].created_at).getTime();
      expect(current).toBeGreaterThanOrEqual(next);
    }
  });

  it('should sort by created_at ascending', async () => {
    const response = await fetch('http://localhost:8347/api/jobs?sort=created_at&order=asc');

    expect(response.status).toBe(200);
    const data = await response.json();

    // Verify ascending order
    for (let i = 0; i < data.jobs.length - 1; i++) {
      const current = new Date(data.jobs[i].created_at).getTime();
      const next = new Date(data.jobs[i + 1].created_at).getTime();
      expect(current).toBeLessThanOrEqual(next);
    }
  });

  it('should search by title', async () => {
    const response = await fetch('http://localhost:8347/api/jobs?search=Test Job 1');

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.jobs.length).toBeGreaterThanOrEqual(1);
    expect(data.jobs[0].title).toContain('Test Job 1');
  });

  it('should handle pagination', async () => {
    const page1Response = await fetch('http://localhost:8347/api/jobs?page=1&limit=2');
    expect(page1Response.status).toBe(200);
    const page1Data = await page1Response.json();
    expect(page1Data.jobs.length).toBeLessThanOrEqual(2);

    const page2Response = await fetch('http://localhost:8347/api/jobs?page=2&limit=2');
    expect(page2Response.status).toBe(200);
    const page2Data = await page2Response.json();

    // Page 2 should have different jobs than page 1
    if (page2Data.jobs.length > 0 && page1Data.jobs.length > 0) {
      expect(page1Data.jobs[0].id).not.toBe(page2Data.jobs[0].id);
    }
  });

  it('should return empty array for no matches', async () => {
    const response = await fetch(
      'http://localhost:8347/api/jobs?search=NonExistentJob12345'
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.jobs).toEqual([]);
  });
});

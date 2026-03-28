/**
 * API Test: POST /api/jobs/bulk (Bulk Operations)
 *
 * Tests bulk operations endpoint (delete, cancel, retry)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestJob } from '../../../utils/db-helpers';
import { pool } from '@/lib/db';

describe('POST /api/jobs/bulk - Bulk Operations', () => {
  let testJobIds: string[] = [];

  beforeEach(async () => {
    // Create test jobs
    const jobs = await Promise.all([
      createTestJob({ title: 'Bulk Test Job 1', status: 'pending' }),
      createTestJob({ title: 'Bulk Test Job 2', status: 'pending' }),
      createTestJob({ title: 'Bulk Test Job 3', status: 'failed' }),
      createTestJob({ title: 'Bulk Test Job 4', status: 'analyzing' }),
      createTestJob({ title: 'Bulk Test Job 5', status: 'completed' }),
    ]);
    testJobIds = jobs.map((j) => j.id);
  });

  afterEach(async () => {
    // Cleanup
    for (const jobId of testJobIds) {
      await pool.query('DELETE FROM news_jobs WHERE id = $1', [jobId]);
    }
    testJobIds = [];
  });

  it('should delete multiple jobs', async () => {
    const jobsToDelete = testJobIds.slice(0, 3);

    const response = await fetch('http://localhost:8347/api/jobs/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete',
        job_ids: jobsToDelete,
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.deleted).toBe(3);

    // Verify jobs deleted
    const result = await pool.query('SELECT id FROM news_jobs WHERE id = ANY($1)', [jobsToDelete]);
    expect(result.rows).toHaveLength(0);
  });

  it('should cancel multiple jobs', async () => {
    const jobsToCancel = testJobIds.slice(0, 2);

    const response = await fetch('http://localhost:8347/api/jobs/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'cancel',
        job_ids: jobsToCancel,
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.cancelled).toBe(2);

    // Verify jobs cancelled
    const result = await pool.query('SELECT status FROM news_jobs WHERE id = ANY($1)', [
      jobsToCancel,
    ]);
    result.rows.forEach((job) => {
      expect(job.status).toBe('cancelled');
    });
  });

  it('should retry failed jobs', async () => {
    // Find the failed job
    const failedJobId = testJobIds[2]; // Job 3 was created with status 'failed'

    const response = await fetch('http://localhost:8347/api/jobs/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'retry',
        job_ids: [failedJobId],
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.retried).toBe(1);

    // Verify job reset to pending
    const result = await pool.query('SELECT status FROM news_jobs WHERE id = $1', [failedJobId]);
    expect(result.rows[0].status).toBe('pending');
  });

  it('should reject invalid action', async () => {
    const response = await fetch('http://localhost:8347/api/jobs/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'invalid-action',
        job_ids: testJobIds,
      }),
    });

    expect(response.status).toBe(400);
  });

  it('should reject empty job_ids array', async () => {
    const response = await fetch('http://localhost:8347/api/jobs/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete',
        job_ids: [],
      }),
    });

    expect(response.status).toBe(400);
  });
});

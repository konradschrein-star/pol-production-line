/**
 * API Test: PATCH /api/jobs/[id] (Job Update)
 *
 * Tests job update endpoint for updating job fields
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestJob, deleteTestJob, fetchJob } from '../../../utils/db-helpers';

describe('PATCH /api/jobs/[id] - Job Update', () => {
  let testJobId: string;

  beforeEach(async () => {
    const job = await createTestJob({ title: 'Test Job', status: 'pending' });
    testJobId = job.id;
  });

  afterEach(async () => {
    if (testJobId) {
      await deleteTestJob(testJobId);
    }
  });

  it('should update job title', async () => {
    const response = await fetch(`http://localhost:8347/api/jobs/${testJobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Updated Job Title',
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.title).toBe('Updated Job Title');
  });

  it('should update job metadata', async () => {
    const response = await fetch(`http://localhost:8347/api/jobs/${testJobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_metadata: { custom_field: 'test value' },
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.job_metadata.custom_field).toBe('test value');
  });

  it('should update job status (valid transition)', async () => {
    const response = await fetch(`http://localhost:8347/api/jobs/${testJobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'analyzing',
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe('analyzing');
  });

  it('should return 404 for non-existent job', async () => {
    const response = await fetch(`http://localhost:8347/api/jobs/00000000-0000-0000-0000-000000000000`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Updated Title',
      }),
    });

    expect(response.status).toBe(404);
  });

  it('should reject invalid JSON', async () => {
    const response = await fetch(`http://localhost:8347/api/jobs/${testJobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json',
    });

    expect(response.status).toBe(400);
  });
});

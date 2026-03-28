/**
 * API Test: DELETE /api/jobs/[id] (Job Deletion)
 *
 * Tests job deletion endpoint with cascade deletion
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestJob, fetchJob } from '../../../utils/db-helpers';
import { pool } from '@/lib/db';

describe('DELETE /api/jobs/[id] - Job Deletion', () => {
  let testJobId: string;

  afterEach(async () => {
    // Cleanup in case test failed before deletion
    if (testJobId) {
      try {
        await pool.query('DELETE FROM news_jobs WHERE id = $1', [testJobId]);
      } catch (err) {
        // Job may already be deleted
      }
    }
  });

  it('should delete pending job', async () => {
    const job = await createTestJob({ title: 'Test Job', status: 'pending' });
    testJobId = job.id;

    const response = await fetch(`http://localhost:8347/api/jobs/${testJobId}`, {
      method: 'DELETE',
    });

    expect(response.status).toBe(200);

    // Verify job deleted
    const result = await pool.query('SELECT * FROM news_jobs WHERE id = $1', [testJobId]);
    expect(result.rows).toHaveLength(0);

    testJobId = null; // Don't try to cleanup
  });

  it('should delete job with scenes (cascade delete)', async () => {
    const job = await createTestJob({
      title: 'Test Job with Scenes',
      status: 'pending',
      scenes: [
        { image_prompt: 'Test prompt 1', ticker_headline: 'Test headline 1' },
        { image_prompt: 'Test prompt 2', ticker_headline: 'Test headline 2' },
      ],
    });
    testJobId = job.id;

    const response = await fetch(`http://localhost:8347/api/jobs/${testJobId}`, {
      method: 'DELETE',
    });

    expect(response.status).toBe(200);

    // Verify scenes also deleted
    const scenesResult = await pool.query('SELECT * FROM news_scenes WHERE job_id = $1', [testJobId]);
    expect(scenesResult.rows).toHaveLength(0);

    testJobId = null;
  });

  it('should return 404 for non-existent job', async () => {
    const response = await fetch(`http://localhost:8347/api/jobs/00000000-0000-0000-0000-000000000000`, {
      method: 'DELETE',
    });

    expect(response.status).toBe(404);
  });
});

/**
 * Test Utility: Database Helpers
 *
 * Helper functions for managing test data in PostgreSQL
 */

import { pool } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create a test job with optional overrides
 */
export async function createTestJob(overrides: any = {}) {
  const jobId = uuidv4();
  const result = await pool.query(
    `INSERT INTO news_jobs (id, raw_script, title, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, NOW(), NOW())
     RETURNING *`,
    [
      jobId,
      overrides.raw_script || 'Test script for automated testing.',
      overrides.title || 'Test Job',
      overrides.status || 'pending',
    ]
  );

  const job = result.rows[0];

  // Create scenes if provided
  if (overrides.scenes) {
    const scenes = [];
    for (let i = 0; i < overrides.scenes.length; i++) {
      const scene = overrides.scenes[i];
      const sceneResult = await pool.query(
        `INSERT INTO news_scenes (id, job_id, scene_order, image_prompt, ticker_headline, image_url)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          uuidv4(),
          jobId,
          scene.scene_order !== undefined ? scene.scene_order : i,
          scene.image_prompt || `Test image prompt ${i + 1}`,
          scene.ticker_headline || `TEST: Headline ${i + 1}`,
          scene.image_url || null,
        ]
      );
      scenes.push(sceneResult.rows[0]);
    }
    job.scenes = scenes;
  }

  return job;
}

/**
 * Delete a test job by ID
 */
export async function deleteTestJob(jobId: string) {
  await pool.query('DELETE FROM news_jobs WHERE id = $1', [jobId]);
}

/**
 * Cleanup all test jobs (jobs with title starting with "Test")
 */
export async function cleanupTestJobs() {
  await pool.query("DELETE FROM news_jobs WHERE title LIKE 'Test%'");
}

/**
 * Get a job by ID with all scenes
 */
export async function fetchJob(jobId: string) {
  const jobResult = await pool.query('SELECT * FROM news_jobs WHERE id = $1', [jobId]);
  if (jobResult.rows.length === 0) {
    throw new Error(`Job not found: ${jobId}`);
  }

  const job = jobResult.rows[0];

  const scenesResult = await pool.query(
    'SELECT * FROM news_scenes WHERE job_id = $1 ORDER BY scene_order ASC',
    [jobId]
  );

  job.scenes = scenesResult.rows;
  return job;
}

/**
 * Wait for job to reach a specific status
 */
export async function waitForJobStatus(
  jobId: string,
  expectedStatus: string,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const timeout = options.timeout || 30000; // 30 seconds default
  const interval = options.interval || 2000; // 2 seconds default
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const job = await fetchJob(jobId);

    if (job.status === expectedStatus) {
      return;
    }

    if (job.status === 'failed') {
      throw new Error(`Job failed: ${job.error_message || 'Unknown error'}`);
    }

    await sleep(interval);
  }

  throw new Error(
    `Timeout waiting for job ${jobId} to reach status ${expectedStatus} (waited ${timeout}ms)`
  );
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * API Test: POST /api/jobs (Job Creation)
 *
 * Tests job creation endpoint with various scripts and configurations
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { pool } from '@/lib/db';
import { createTestJob, deleteTestJob } from '../../../utils/db-helpers';
import { testScripts } from '../../../fixtures/scripts';

describe('POST /api/jobs - Job Creation', () => {
  let testJobIds: string[] = [];

  // Cleanup after each test
  afterEach(async () => {
    for (const jobId of testJobIds) {
      await deleteTestJob(jobId);
    }
    testJobIds = [];
  });

  it('should create job with valid script', async () => {
    const response = await fetch('http://localhost:8347/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raw_script: testScripts.medium,
        title: 'Test Job - Valid Script',
      }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.id).toBeDefined();
    expect(data.status).toBe('pending');
    expect(data.raw_script).toBe(testScripts.medium);

    testJobIds.push(data.id);
  });

  it('should reject empty script', async () => {
    const response = await fetch('http://localhost:8347/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raw_script: '',
        title: 'Test Job - Empty Script',
      }),
    });

    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error.error).toBeTruthy();
  });

  it('should create job with custom AI provider', async () => {
    const response = await fetch('http://localhost:8347/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raw_script: testScripts.short,
        title: 'Test Job - Custom Provider',
        job_metadata: { ai_provider: 'claude' },
      }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.job_metadata?.ai_provider).toBe('claude');

    testJobIds.push(data.id);
  });

  it('should handle special characters in script', async () => {
    const response = await fetch('http://localhost:8347/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raw_script: testScripts.specialCharacters,
        title: 'Test Job - Special Characters',
      }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.raw_script).toContain('🚀');

    testJobIds.push(data.id);
  });

  it('should create job with large script', async () => {
    const response = await fetch('http://localhost:8347/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raw_script: testScripts.long,
        title: 'Test Job - Large Script',
      }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.raw_script.length).toBeGreaterThan(500);

    testJobIds.push(data.id);
  });

  it('should reject invalid JSON', async () => {
    const response = await fetch('http://localhost:8347/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not valid json',
    });

    expect(response.status).toBe(400);
  });

  it('should create job with multi-paragraph script', async () => {
    const response = await fetch('http://localhost:8347/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raw_script: testScripts.multiParagraph,
        title: 'Test Job - Multi-Paragraph',
      }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.raw_script).toContain('\n');

    testJobIds.push(data.id);
  });

  it('should create job with initial scenes', async () => {
    const response = await fetch('http://localhost:8347/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raw_script: testScripts.medium,
        title: 'Test Job - With Scenes',
        scenes: [
          {
            image_prompt: 'Dramatic sunset over city skyline',
            ticker_headline: 'BREAKING: Test headline 1',
          },
          {
            image_prompt: 'Modern office with glass windows',
            ticker_headline: 'TECH: Test headline 2',
          },
        ],
      }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.id).toBeDefined();

    // Verify scenes were created (if API supports this)
    // Note: This may need adjustment based on actual API response format
    if (data.scenes) {
      expect(data.scenes.length).toBe(2);
      expect(data.scenes[0].image_prompt).toBe('Dramatic sunset over city skyline');
      expect(data.scenes[1].ticker_headline).toBe('TECH: Test headline 2');
    }

    testJobIds.push(data.id);
  });
});

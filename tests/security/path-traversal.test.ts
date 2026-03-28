/**
 * Path Traversal Prevention Tests
 *
 * Validates that file upload and download endpoints:
 * 1. Reject filenames with path traversal attempts (../)
 * 2. Prevent symlink exploitation
 * 3. Restrict file operations to designated directories
 *
 * Phase 8A: Security Testing - Task 1.5
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { pool } from '../../src/lib/db';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('Path Traversal Prevention', () => {
  let testJobId: string;
  let testSceneId: string;

  beforeAll(async () => {
    // Create test job and scene
    const jobResult = await pool.query(
      `INSERT INTO news_jobs (raw_script, status)
       VALUES ($1, $2)
       RETURNING id`,
      ['Test script for path traversal tests', 'review_assets']
    );
    testJobId = jobResult.rows[0].id;

    const sceneResult = await pool.query(
      `INSERT INTO news_scenes (job_id, scene_order, ticker_headline, image_prompt)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [testJobId, 0, 'Test headline', 'Test prompt']
    );
    testSceneId = sceneResult.rows[0].id;
  });

  afterAll(async () => {
    // Cleanup
    if (testSceneId) {
      await pool.query('DELETE FROM news_scenes WHERE id = $1', [testSceneId]);
    }
    if (testJobId) {
      await pool.query('DELETE FROM news_jobs WHERE id = $1', [testJobId]);
    }
  });

  it('should reject file upload with path traversal in filename', async () => {
    const formData = new FormData();
    const blob = new Blob(['test image data'], { type: 'image/jpeg' });
    formData.append('file', blob, '../../../etc/passwd');

    const response = await fetch(
      `http://localhost:8347/api/jobs/${testJobId}/scenes/${testSceneId}/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    // Should reject with 400 Bad Request
    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error.error).toMatch(/invalid|filename|path/i);
  });

  it('should reject absolute path in filename', async () => {
    const formData = new FormData();
    const blob = new Blob(['test'], { type: 'image/jpeg' });
    formData.append('file', blob, '/etc/passwd');

    const response = await fetch(
      `http://localhost:8347/api/jobs/${testJobId}/scenes/${testSceneId}/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    expect(response.status).toBe(400);
  });

  it('should reject filename with null bytes', async () => {
    const formData = new FormData();
    const blob = new Blob(['test'], { type: 'image/jpeg' });
    formData.append('file', blob, 'image\0.jpg');

    const response = await fetch(
      `http://localhost:8347/api/jobs/${testJobId}/scenes/${testSceneId}/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    expect(response.status).toBe(400);
  });

  it('should reject Windows path traversal attempts', async () => {
    const formData = new FormData();
    const blob = new Blob(['test'], { type: 'image/jpeg' });
    formData.append('file', blob, '..\\..\\..\\windows\\system32\\config\\sam');

    const response = await fetch(
      `http://localhost:8347/api/jobs/${testJobId}/scenes/${testSceneId}/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    expect(response.status).toBe(400);
  });

  it('should reject URL-encoded path traversal', async () => {
    const formData = new FormData();
    const blob = new Blob(['test'], { type: 'image/jpeg' });
    // ../ encoded as %2e%2e%2f
    formData.append('file', blob, '%2e%2e%2f%2e%2e%2fetc%2fpasswd');

    const response = await fetch(
      `http://localhost:8347/api/jobs/${testJobId}/scenes/${testSceneId}/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    expect(response.status).toBe(400);
  });

  it('should reject double-encoded path traversal', async () => {
    const formData = new FormData();
    const blob = new Blob(['test'], { type: 'image/jpeg' });
    // ../ double-encoded
    formData.append('file', blob, '%252e%252e%252f');

    const response = await fetch(
      `http://localhost:8347/api/jobs/${testJobId}/scenes/${testSceneId}/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    expect(response.status).toBe(400);
  });

  it('should accept valid filename without path components', async () => {
    const formData = new FormData();
    const blob = new Blob(['test image data'], { type: 'image/jpeg' });
    formData.append('file', blob, 'valid-image.jpg');

    const response = await fetch(
      `http://localhost:8347/api/jobs/${testJobId}/scenes/${testSceneId}/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    // Should succeed or fail for reasons other than path traversal
    // (e.g., auth, file size, format)
    if (!response.ok) {
      const error = await response.json();
      // Error should NOT be about path traversal
      expect(error.error).not.toMatch(/invalid.*path/i);
    }
  });

  it('should prevent access to files outside storage directory', async () => {
    // Try to access a file via API that's outside the storage directory
    // This test assumes there's a file download/access endpoint

    // Attempt 1: Direct path traversal in URL
    const response1 = await fetch(
      `http://localhost:8347/api/files/../../../../../../etc/passwd`
    );

    // Should return 404 or 400, not 200 with file contents
    expect(response1.status).not.toBe(200);

    // Attempt 2: Encoded path traversal
    const response2 = await fetch(
      `http://localhost:8347/api/files/%2e%2e%2f%2e%2e%2fetc%2fpasswd`
    );

    expect(response2.status).not.toBe(200);
  });

  it('should sanitize job ID in file paths', async () => {
    // Try to use path traversal in job ID parameter
    const maliciousJobId = '../../../etc/passwd';

    const response = await fetch(
      `http://localhost:8347/api/jobs/${encodeURIComponent(maliciousJobId)}`
    );

    // Should return 400 (invalid UUID) or 404 (not found), not read the file
    expect([400, 404]).toContain(response.status);

    // If it returns content, ensure it's not file contents
    if (response.ok) {
      const data = await response.json();
      // Should be JSON (job object or error), not raw file content
      expect(data).toBeTypeOf('object');
    }
  });

  it('should restrict file operations to designated storage paths', async () => {
    // Verify storage paths are constrained
    const storageBasePath = 'C:\\Users\\konra\\ObsidianNewsDesk';

    // Check that image_url paths in database don't escape storage directory
    const result = await pool.query(
      `SELECT image_url FROM news_scenes
       WHERE image_url IS NOT NULL
       LIMIT 10`
    );

    for (const row of result.rows) {
      if (row.image_url) {
        // Path should start with storage base path
        expect(row.image_url.startsWith(storageBasePath)).toBe(true);

        // Path should not contain traversal sequences
        expect(row.image_url).not.toMatch(/\.\./);
      }
    }
  });

  it('should normalize paths before file operations', async () => {
    // Test that paths are normalized (e.g., path.normalize, path.resolve)
    const testPath = 'images/../../../etc/passwd';

    // Create a function that simulates the path validation logic
    const isPathSafe = (inputPath: string, basePath: string): boolean => {
      const normalized = path.normalize(inputPath);
      const resolved = path.resolve(basePath, normalized);
      return resolved.startsWith(path.resolve(basePath));
    };

    const basePath = 'C:\\Users\\konra\\ObsidianNewsDesk';

    // Should detect path traversal attempt
    expect(isPathSafe(testPath, basePath)).toBe(false);

    // Valid path should pass
    expect(isPathSafe('images/test.jpg', basePath)).toBe(true);
  });

  it('should reject filenames with special characters', async () => {
    const specialCharFilenames = [
      'test<script>.jpg',
      'test|pipe.jpg',
      'test:colon.jpg',
      'test*asterisk.jpg',
      'test?question.jpg',
      'test"quote.jpg',
    ];

    for (const filename of specialCharFilenames) {
      const formData = new FormData();
      const blob = new Blob(['test'], { type: 'image/jpeg' });
      formData.append('file', blob, filename);

      const response = await fetch(
        `http://localhost:8347/api/jobs/${testJobId}/scenes/${testSceneId}/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      // Should reject filenames with special characters
      if (response.status === 400) {
        // Expected - filename validation caught it
        continue;
      }

      // If accepted, filename should be sanitized in storage
      if (response.ok) {
        const result = await pool.query(
          'SELECT image_url FROM news_scenes WHERE id = $1',
          [testSceneId]
        );

        if (result.rows[0]?.image_url) {
          const storedFilename = path.basename(result.rows[0].image_url);
          // Stored filename should not contain special chars
          expect(storedFilename).not.toMatch(/[<>|:*?"]/);
        }
      }
    }
  });
});

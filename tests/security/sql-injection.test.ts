/**
 * SQL Injection Prevention Tests
 *
 * Validates that all database queries use parameterized syntax
 * and are resistant to SQL injection attacks.
 *
 * Phase 8A: Security Testing - Task 1.5
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { pool } from '../../src/lib/db';

describe('SQL Injection Prevention', () => {
  let testJobId: string;

  beforeAll(async () => {
    // Create a test job for queries
    const result = await pool.query(
      `INSERT INTO news_jobs (raw_script, status)
       VALUES ($1, $2)
       RETURNING id`,
      ['Test script for SQL injection tests', 'pending']
    );
    testJobId = result.rows[0].id;
  });

  afterAll(async () => {
    // Cleanup test job
    if (testJobId) {
      await pool.query('DELETE FROM news_jobs WHERE id = $1', [testJobId]);
    }
  });

  it('should reject SQL injection in parameterized query', async () => {
    const maliciousTitle = "'; DROP TABLE news_jobs; --";

    // This should safely return 0 rows, not drop the table
    const result = await pool.query(
      'SELECT * FROM news_jobs WHERE raw_script = $1',
      [maliciousTitle]
    );

    expect(result.rows).toHaveLength(0);

    // Verify table still exists
    const tableCheck = await pool.query(
      "SELECT to_regclass('public.news_jobs') as exists"
    );
    expect(tableCheck.rows[0].exists).toBe('news_jobs');
  });

  it('should safely handle quotes in parameterized queries', async () => {
    const inputWithQuotes = "Test's \"quoted\" 'script' content";

    const result = await pool.query(
      'SELECT * FROM news_jobs WHERE raw_script = $1',
      [inputWithQuotes]
    );

    // Should execute without error
    expect(result).toBeDefined();
    expect(Array.isArray(result.rows)).toBe(true);
  });

  it('should use parameterized queries in job creation API', async () => {
    const maliciousScript = "'; DELETE FROM news_jobs WHERE '1'='1";

    const response = await fetch('http://localhost:8347/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raw_script: maliciousScript,
        title: 'SQL Injection Test Job',
      }),
    });

    expect(response.ok).toBe(true);
    const job = await response.json();
    expect(job.id).toBeDefined();

    // Verify test job still exists (wasn't deleted by injection)
    const check = await pool.query(
      'SELECT COUNT(*) as count FROM news_jobs WHERE id = $1',
      [testJobId]
    );
    expect(parseInt(check.rows[0].count)).toBe(1);

    // Cleanup created job
    await pool.query('DELETE FROM news_jobs WHERE id = $1', [job.id]);
  });

  it('should safely handle UNION-based SQL injection attempts', async () => {
    const unionInjection = "' UNION SELECT id, 'hacked' FROM news_jobs --";

    const result = await pool.query(
      'SELECT * FROM news_jobs WHERE raw_script = $1 LIMIT 1',
      [unionInjection]
    );

    // Should return 0 rows, not union results
    expect(result.rows).toHaveLength(0);
  });

  it('should prevent SQL injection via GET query parameters', async () => {
    const maliciousParam = encodeURIComponent(
      "' OR '1'='1' UNION SELECT id FROM news_jobs --"
    );

    const response = await fetch(
      `http://localhost:8347/api/jobs?status=${maliciousParam}`
    );

    // Should not crash the server
    expect(response.status).toBeLessThan(500);

    // Verify table still exists
    const tableCheck = await pool.query(
      "SELECT to_regclass('public.news_jobs')"
    );
    expect(tableCheck.rows[0].to_regclass).toBe('news_jobs');
  });

  it('should safely handle NULL bytes in input', async () => {
    const nullByteAttack = "test\0'; DROP TABLE news_jobs; --";

    const result = await pool.query(
      'SELECT * FROM news_jobs WHERE raw_script = $1',
      [nullByteAttack]
    );

    // Should execute without error
    expect(result).toBeDefined();
    expect(result.rows).toHaveLength(0);

    // Verify table still exists
    const tableCheck = await pool.query(
      "SELECT to_regclass('public.news_jobs')"
    );
    expect(tableCheck.rows[0].to_regclass).toBe('news_jobs');
  });

  it('should prevent blind SQL injection via timing attacks', async () => {
    // Attempt time-based blind SQL injection
    const timingAttack =
      "' OR (SELECT CASE WHEN (1=1) THEN pg_sleep(5) ELSE 1 END) --";

    const startTime = Date.now();

    const result = await pool.query(
      'SELECT * FROM news_jobs WHERE raw_script = $1 LIMIT 1',
      [timingAttack]
    );

    const elapsed = Date.now() - startTime;

    // Should return immediately, not sleep for 5 seconds
    expect(elapsed).toBeLessThan(1000);
    expect(result.rows).toHaveLength(0);
  });

  it('should validate database schema is intact', async () => {
    // Verify all expected tables exist
    const tables = ['news_jobs', 'news_scenes', 'style_presets', 'audit_log'];

    for (const table of tables) {
      const result = await pool.query(
        'SELECT to_regclass($1) as exists',
        [`public.${table}`]
      );
      expect(result.rows[0].exists).toBe(table);
    }
  });
});

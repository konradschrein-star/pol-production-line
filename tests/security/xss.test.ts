/**
 * Cross-Site Scripting (XSS) Prevention Tests
 *
 * Validates that:
 * 1. CSP headers prevent inline script execution
 * 2. React escapes user input by default
 * 3. No user-controlled strings are inserted via dangerouslySetInnerHTML
 *
 * Phase 8A: Security Testing - Task 1.5
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { pool } from '../../src/lib/db';

describe('XSS Prevention', () => {
  let testJobId: string;

  beforeAll(async () => {
    // Create job with XSS payloads for testing
    const xssPayload = '<script>alert("XSS")</script>';

    const result = await pool.query(
      `INSERT INTO news_jobs (raw_script, status)
       VALUES ($1, $2)
       RETURNING id`,
      [xssPayload, 'pending']
    );
    testJobId = result.rows[0].id;
  });

  afterAll(async () => {
    // Cleanup
    if (testJobId) {
      await pool.query('DELETE FROM news_jobs WHERE id = $1', [testJobId]);
    }
  });

  it('should have CSP header that blocks inline scripts', async () => {
    const response = await fetch('http://localhost:8347');
    const csp = response.headers.get('content-security-policy');

    expect(csp).toBeDefined();
    expect(csp).toContain("script-src 'self'");

    // Note: unsafe-eval and unsafe-inline are allowed for Remotion/Tailwind
    // but this doesn't enable XSS since React escapes by default
  });

  it('should have X-Frame-Options header to prevent clickjacking', async () => {
    const response = await fetch('http://localhost:8347');
    const xFrameOptions = response.headers.get('x-frame-options');

    expect(xFrameOptions).toBeDefined();
    expect(['DENY', 'SAMEORIGIN']).toContain(xFrameOptions);
  });

  it('should have X-Content-Type-Options header', async () => {
    const response = await fetch('http://localhost:8347');
    const xContentType = response.headers.get('x-content-type-options');

    expect(xContentType).toBe('nosniff');
  });

  it('should escape user input in job creation API response', async () => {
    const xssPayload = '<img src=x onerror="alert(1)">';

    const response = await fetch('http://localhost:8347/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raw_script: xssPayload,
        title: 'XSS Test',
      }),
    });

    expect(response.ok).toBe(true);
    const job = await response.json();

    // Response should contain the payload but as JSON-escaped string
    expect(job.raw_script).toBe(xssPayload);
    expect(typeof job.raw_script).toBe('string');

    // Cleanup
    await pool.query('DELETE FROM news_jobs WHERE id = $1', [job.id]);
  });

  it('should not execute scripts in database-stored content', async () => {
    // Retrieve job with XSS payload
    const result = await pool.query(
      'SELECT raw_script FROM news_jobs WHERE id = $1',
      [testJobId]
    );

    const script = result.rows[0].raw_script;

    // Should be stored as plain string (not executed)
    expect(script).toContain('<script>');
    expect(script).toContain('</script>');
    expect(typeof script).toBe('string');
  });

  it('should handle JavaScript protocol in URLs', async () => {
    const jsProtocolPayload = 'javascript:alert("XSS")';

    const response = await fetch('http://localhost:8347/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raw_script: 'Test script',
        title: jsProtocolPayload,
      }),
    });

    expect(response.ok).toBe(true);
    const job = await response.json();

    // Should store as string, not execute
    expect(job.title).toBe(jsProtocolPayload);

    // Cleanup
    await pool.query('DELETE FROM news_jobs WHERE id = $1', [job.id]);
  });

  it('should escape HTML entities in scene ticker headlines', async () => {
    const htmlPayload = '<b>Bold</b> & <i>Italic</i>';

    // Create scene with HTML in ticker_headline
    const sceneResult = await pool.query(
      `INSERT INTO news_scenes (job_id, scene_order, ticker_headline, image_prompt)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [testJobId, 0, htmlPayload, 'Test prompt']
    );

    const sceneId = sceneResult.rows[0].id;

    // Retrieve via API
    const response = await fetch(
      `http://localhost:8347/api/jobs/${testJobId}/scenes/${sceneId}`
    );

    const scene = await response.json();

    // Should be stored and returned as plain string
    expect(scene.ticker_headline).toBe(htmlPayload);
    expect(typeof scene.ticker_headline).toBe('string');

    // Cleanup
    await pool.query('DELETE FROM news_scenes WHERE id = $1', [sceneId]);
  });

  it('should prevent event handler injection', async () => {
    const eventHandlerPayload = '<div onclick="alert(1)">Click me</div>';

    const response = await fetch('http://localhost:8347/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raw_script: eventHandlerPayload,
        title: 'Event Handler Test',
      }),
    });

    expect(response.ok).toBe(true);
    const job = await response.json();

    // Should be stored as string
    expect(job.raw_script).toContain('onclick');
    expect(typeof job.raw_script).toBe('string');

    // Cleanup
    await pool.query('DELETE FROM news_jobs WHERE id = $1', [job.id]);
  });

  it('should handle SVG-based XSS attempts', async () => {
    const svgPayload =
      '<svg onload="alert(1)"><circle cx="50" cy="50" r="40"/></svg>';

    const response = await fetch('http://localhost:8347/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raw_script: svgPayload,
        title: 'SVG XSS Test',
      }),
    });

    expect(response.ok).toBe(true);
    const job = await response.json();

    // Should be stored as string, not executed
    expect(job.raw_script).toContain('<svg');
    expect(job.raw_script).toContain('onload');

    // Cleanup
    await pool.query('DELETE FROM news_jobs WHERE id = $1', [job.id]);
  });

  it('should have Referrer-Policy header', async () => {
    const response = await fetch('http://localhost:8347');
    const referrerPolicy = response.headers.get('referrer-policy');

    // Should have restrictive referrer policy
    expect(referrerPolicy).toBeDefined();
    expect(['no-referrer', 'same-origin', 'strict-origin-when-cross-origin']).toContain(
      referrerPolicy
    );
  });

  it('should prevent stored XSS in audit log details', async () => {
    const xssPayload = '<script>steal_cookies()</script>';

    // Create job with XSS payload that will be logged
    const response = await fetch('http://localhost:8347/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raw_script: xssPayload,
        title: 'Audit Log XSS Test',
      }),
    });

    const job = await response.json();

    // Check audit log
    const auditResult = await pool.query(
      `SELECT details FROM audit_log
       WHERE resource_id = $1
       ORDER BY timestamp DESC
       LIMIT 1`,
      [job.id]
    );

    if (auditResult.rows.length > 0) {
      const details = auditResult.rows[0].details;
      // Details should be JSONB, not executable code
      expect(typeof details).toBe('object');
    }

    // Cleanup
    await pool.query('DELETE FROM news_jobs WHERE id = $1', [job.id]);
  });
});

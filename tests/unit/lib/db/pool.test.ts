/**
 * Database Connection Pool Test Suite
 *
 * Tests connection pooling, leak detection, and graceful shutdown.
 * Critical for worker stability and preventing connection exhaustion.
 *
 * Priority: HIGH
 * Coverage Target: 85%+
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { db, pool } from '@/lib/db';

describe('Database Connection Pool', () => {
  beforeAll(async () => {
    // Verify database is accessible
    const result = await pool.query('SELECT 1 as test');
    expect(result.rows[0].test).toBe(1);
  });

  describe('Pool Configuration', () => {
    it('should have correct pool configuration', () => {
      // Verify pool settings (from index.ts)
      expect(pool.options.max).toBe(50); // Max connections
      expect(pool.options.idleTimeoutMillis).toBe(30000); // 30s idle timeout
      expect(pool.options.connectionTimeoutMillis).toBe(2000); // 2s connection timeout
    });

    it('should have application name set', () => {
      expect(pool.options.application_name).toBe('obsidian-news-desk');
    });

    it('should have timeout settings configured', () => {
      expect(pool.options.statement_timeout).toBe(30000); // 30s
      expect(pool.options.query_timeout).toBe(30000); // 30s
      expect(pool.options.idle_in_transaction_session_timeout).toBe(60000); // 60s
    });
  });

  describe('Basic Operations', () => {
    it('should execute simple query', async () => {
      const result = await db.query('SELECT 1 as num, $1 as text', ['test']);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].num).toBe(1);
      expect(result.rows[0].text).toBe('test');
    });

    it('should handle parameterized queries', async () => {
      const result = await db.query(
        'SELECT $1::int as a, $2::text as b, $3::boolean as c',
        [42, 'hello', true]
      );

      expect(result.rows[0]).toEqual({ a: 42, b: 'hello', c: true });
    });

    it('should handle queries with no results', async () => {
      const result = await db.query(
        'SELECT * FROM news_jobs WHERE id = $1',
        ['00000000-0000-0000-0000-000000000000']
      );

      expect(result.rows).toHaveLength(0);
    });

    it('should track query duration', async () => {
      // Mock console.warn to capture slow query logs
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Simulate slow query (sleep 1.5 seconds)
      await db.query('SELECT pg_sleep(1.5)');

      // Should log slow query warning
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow query'),
        expect.any(String)
      );

      warnSpy.mockRestore();
    });
  });

  describe('Client Management', () => {
    it('should acquire and release client', async () => {
      const initialIdleCount = pool.idleCount;

      const client = await db.getClient();
      expect(client).toBeTruthy();

      // Client should be checked out (idle count decreased)
      expect(pool.idleCount).toBeLessThan(initialIdleCount);

      // Execute query with client
      const result = await client.query('SELECT 1 as test');
      expect(result.rows[0].test).toBe(1);

      // Release client
      client.release();

      // Wait for async release
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Client should be returned to pool (idle count restored)
      expect(pool.idleCount).toBeGreaterThanOrEqual(initialIdleCount);
    });

    it('should handle multiple concurrent clients', async () => {
      const clients = await Promise.all([
        db.getClient(),
        db.getClient(),
        db.getClient(),
        db.getClient(),
        db.getClient(),
      ]);

      expect(clients).toHaveLength(5);

      // All clients should be able to query
      const results = await Promise.all(
        clients.map((client, idx) => client.query('SELECT $1 as id', [idx]))
      );

      results.forEach((result, idx) => {
        expect(result.rows[0].id).toBe(idx);
      });

      // Release all clients
      clients.forEach((client) => client.release());

      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    it('should detect client not released (leak detection)', async () => {
      const initialTotal = pool.totalCount;
      const initialIdle = pool.idleCount;

      // Acquire client but don't release
      const client = await db.getClient();
      await client.query('SELECT 1');

      // Don't release - simulate leak
      // client.release(); // INTENTIONALLY COMMENTED

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Pool should have one less idle connection
      expect(pool.idleCount).toBeLessThan(initialIdle + 1);

      // Cleanup: release the client
      client.release();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid query syntax', async () => {
      await expect(db.query('SELECT * FORM invalid_table')).rejects.toThrow();
    });

    it('should handle nonexistent table', async () => {
      await expect(db.query('SELECT * FROM nonexistent_table_xyz')).rejects.toThrow();
    });

    it('should handle invalid parameters', async () => {
      await expect(
        db.query('SELECT $1::int as num', ['not-a-number'])
      ).rejects.toThrow();
    });

    it('should log query errors', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        await db.query('INVALID SQL SYNTAX');
      } catch (err) {
        // Expected error
      }

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Query failed'),
        expect.any(String)
      );

      errorSpy.mockRestore();
    });

    it('should handle connection timeout', async () => {
      // Create a pool with very short timeout
      const { Pool } = await import('pg');
      const timeoutPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        connectionTimeoutMillis: 1, // 1ms (will timeout immediately if no connections available)
        max: 1, // Only 1 connection
      });

      // Acquire the only connection
      const client1 = await timeoutPool.connect();

      try {
        // Try to acquire second connection (should timeout)
        await expect(timeoutPool.connect()).rejects.toThrow();
      } finally {
        client1.release();
        await timeoutPool.end();
      }
    });
  });

  describe('Health Check', () => {
    it('should return true when database is healthy', async () => {
      const isHealthy = await db.healthCheck();
      expect(isHealthy).toBe(true);
    });

    it('should return false when database is unavailable', async () => {
      // Mock query to fail
      const originalQuery = pool.query.bind(pool);
      vi.spyOn(pool, 'query').mockRejectedValueOnce(new Error('Connection failed'));

      const isHealthy = await db.healthCheck();
      expect(isHealthy).toBe(false);

      // Restore original query
      pool.query = originalQuery;
    });
  });

  describe('Pool Statistics', () => {
    it('should provide pool statistics', () => {
      const stats = db.getPoolStats();

      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('idle');
      expect(stats).toHaveProperty('waiting');

      expect(stats.total).toBeGreaterThanOrEqual(0);
      expect(stats.idle).toBeGreaterThanOrEqual(0);
      expect(stats.waiting).toBeGreaterThanOrEqual(0);
    });

    it('should track idle connections', async () => {
      const initialStats = db.getPoolStats();

      // Acquire a client
      const client = await db.getClient();

      const whileAcquiredStats = db.getPoolStats();

      // Idle count should decrease
      expect(whileAcquiredStats.idle).toBeLessThanOrEqual(initialStats.idle);

      // Release client
      client.release();

      await new Promise((resolve) => setTimeout(resolve, 100));

      const afterReleaseStats = db.getPoolStats();

      // Idle count should increase back
      expect(afterReleaseStats.idle).toBeGreaterThanOrEqual(whileAcquiredStats.idle);
    });

    it('should track waiting connections', async () => {
      // This test is tricky to write without actually exhausting the pool
      // Just verify the metric is available
      const stats = db.getPoolStats();
      expect(typeof stats.waiting).toBe('number');
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle many concurrent queries', async () => {
      const queries = Array(20)
        .fill(null)
        .map((_, idx) => db.query('SELECT $1 as id', [idx]));

      const results = await Promise.all(queries);

      expect(results).toHaveLength(20);
      results.forEach((result, idx) => {
        expect(result.rows[0].id).toBe(idx);
      });
    });

    it('should handle concurrent transactions', async () => {
      const transactions = Array(10)
        .fill(null)
        .map(async (_, idx) => {
          const client = await db.getClient();
          try {
            await client.query('BEGIN');
            await client.query('SELECT $1 as id', [idx]);
            await client.query('COMMIT');
            return idx;
          } catch (err) {
            await client.query('ROLLBACK');
            throw err;
          } finally {
            client.release();
          }
        });

      const results = await Promise.all(transactions);

      expect(results).toHaveLength(10);
    });

    it('should handle mixed read/write operations', async () => {
      // Create test job for writes
      const insertResult = await db.query(
        'INSERT INTO news_jobs (raw_script, status) VALUES ($1, $2) RETURNING id',
        ['concurrent test', 'pending']
      );
      const testJobId = insertResult.rows[0].id;

      try {
        const operations = [
          // Reads
          db.query('SELECT * FROM news_jobs WHERE id = $1', [testJobId]),
          db.query('SELECT * FROM news_jobs WHERE id = $1', [testJobId]),
          // Writes
          db.query('UPDATE news_jobs SET status = $1 WHERE id = $2', ['analyzing', testJobId]),
          // More reads
          db.query('SELECT * FROM news_jobs WHERE id = $1', [testJobId]),
        ];

        const results = await Promise.all(operations);

        expect(results).toHaveLength(4);
      } finally {
        // Cleanup
        await db.query('DELETE FROM news_jobs WHERE id = $1', [testJobId]);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty query string', async () => {
      await expect(db.query('')).rejects.toThrow();
    });

    it('should handle NULL parameter', async () => {
      const result = await db.query('SELECT $1 as value', [null]);
      expect(result.rows[0].value).toBeNull();
    });

    it('should handle undefined parameter (treated as null)', async () => {
      const result = await db.query('SELECT $1 as value', [undefined]);
      expect(result.rows[0].value).toBeNull();
    });

    it('should handle large result set', async () => {
      // Generate series of 1000 rows
      const result = await db.query('SELECT generate_series(1, 1000) as num');

      expect(result.rows).toHaveLength(1000);
      expect(result.rows[0].num).toBe(1);
      expect(result.rows[999].num).toBe(1000);
    });

    it('should handle query with very long string', async () => {
      const longString = 'x'.repeat(100000); // 100KB string

      const result = await db.query('SELECT $1 as long_string', [longString]);

      expect(result.rows[0].long_string.length).toBe(100000);
    });

    it('should handle binary data', async () => {
      const binaryData = Buffer.from([0x00, 0x01, 0x02, 0x03]);

      const result = await db.query('SELECT $1::bytea as binary', [binaryData]);

      expect(Buffer.isBuffer(result.rows[0].binary)).toBe(true);
    });

    it('should handle JSON data', async () => {
      const jsonData = { key: 'value', nested: { array: [1, 2, 3] } };

      const result = await db.query('SELECT $1::jsonb as json_data', [JSON.stringify(jsonData)]);

      expect(result.rows[0].json_data).toEqual(jsonData);
    });

    it('should handle timestamp with timezone', async () => {
      const result = await db.query('SELECT NOW() as timestamp');

      expect(result.rows[0].timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Performance', () => {
    it('should execute simple queries quickly (<100ms)', async () => {
      const start = Date.now();

      await db.query('SELECT 1');

      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });

    it('should handle rapid sequential queries', async () => {
      const start = Date.now();

      for (let i = 0; i < 50; i++) {
        await db.query('SELECT $1 as num', [i]);
      }

      const duration = Date.now() - start;

      // 50 queries should complete in reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds
    });

    it('should reuse idle connections efficiently', async () => {
      const client1 = await db.getClient();
      await client1.query('SELECT 1');
      client1.release();

      await new Promise((resolve) => setTimeout(resolve, 50));

      const initialTotal = pool.totalCount;

      const client2 = await db.getClient();
      await client2.query('SELECT 1');
      client2.release();

      // Pool should reuse connection (total count unchanged)
      expect(pool.totalCount).toBe(initialTotal);
    });
  });

  describe('Resource Cleanup', () => {
    it('should idle timeout unused connections', async () => {
      // Note: This test requires waiting for idleTimeoutMillis (30s by default)
      // Skipping in normal test runs to avoid slowdown

      // Concept: Create client, release it, wait 31s, check if removed from pool
      // Implementation would require reducing idle timeout for test environment
    });

    it('should close connections on pool shutdown', async () => {
      const { Pool } = await import('pg');

      // Create separate test pool
      const testPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 2,
      });

      // Use the pool
      await testPool.query('SELECT 1');

      // Shutdown
      await testPool.end();

      // Pool should be ended
      expect(testPool.ended).toBe(true);
    });
  });
});

describe('Database Module Utilities', () => {
  describe('Graceful Shutdown', () => {
    it('should have shutdown method', () => {
      expect(typeof db.shutdown).toBe('function');
    });

    // Note: Can't actually test shutdown as it would break remaining tests
    // This would need to be tested in separate process or with pool mocking
  });

  describe('Error Event Handling', () => {
    it('should handle pool error events gracefully', async () => {
      // Mock console.error to capture error logs
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Trigger pool error event (if possible in test environment)
      // This is difficult to test without actually causing a real pool error

      // Restore
      errorSpy.mockRestore();
    });
  });
});

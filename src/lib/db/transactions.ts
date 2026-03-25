/**
 * Transaction Layer for Database Operations
 *
 * Provides:
 * - Transaction abstraction with automatic rollback
 * - Advisory locks for state machine transitions
 * - Prevents race conditions in BullMQ workers
 */

import { PoolClient } from 'pg';
import { db } from './index';

/**
 * Execute a callback within a database transaction
 * Automatically rolls back on error, commits on success
 *
 * @param callback - Async function receiving a database client
 * @returns Result from the callback
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Transition job state with pessimistic locking
 *
 * Uses PostgreSQL advisory locks to prevent multiple workers from
 * transitioning the same job simultaneously. The lock is automatically
 * released at transaction end.
 *
 * @param client - Database client (must be in transaction)
 * @param jobId - Job UUID
 * @param fromStatus - Expected current status (validation)
 * @param toStatus - New status to transition to
 * @returns true if transition succeeded, false if job was in wrong state or lock failed
 */
export async function transitionJobState(
  client: PoolClient,
  jobId: string,
  fromStatus: string,
  toStatus: string
): Promise<boolean> {
  // Try to acquire advisory lock on job ID (converted to integer via hash)
  // pg_try_advisory_xact_lock returns true if lock acquired, false if already held
  // Lock is automatically released at transaction end
  const result = await client.query(
    `UPDATE news_jobs
     SET status = $2, updated_at = NOW()
     WHERE id = $1
       AND status = $3
       AND pg_try_advisory_xact_lock(hashtext($1::text))
     RETURNING id`,
    [jobId, toStatus, fromStatus]
  );

  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Transition job state with pessimistic locking (non-transactional)
 *
 * Use this when you need to transition state outside of a transaction.
 * Creates its own transaction internally.
 *
 * @param jobId - Job UUID
 * @param fromStatus - Expected current status
 * @param toStatus - New status to transition to
 * @returns true if transition succeeded, false otherwise
 */
export async function transitionJobStateStandalone(
  jobId: string,
  fromStatus: string,
  toStatus: string
): Promise<boolean> {
  return withTransaction(async (client) => {
    return transitionJobState(client, jobId, fromStatus, toStatus);
  });
}

/**
 * Execute a query within a transaction
 * Convenience wrapper for simple transactional operations
 *
 * @param query - SQL query string
 * @param params - Query parameters
 * @returns Query result rows
 */
export async function transactionalQuery<T = any>(
  query: string,
  params?: any[]
): Promise<T[]> {
  return withTransaction(async (client) => {
    const result = await client.query(query, params);
    return result.rows as T[];
  });
}

/**
 * Transaction Layer for Database Operations
 *
 * Provides:
 * - Transaction abstraction with automatic rollback
 * - Advisory locks for state machine transitions
 * - Prevents race conditions in BullMQ workers
 * - Timeout protection to prevent connection leaks
 */

import { PoolClient } from 'pg';
import { db } from './index';

/**
 * Default transaction timeout (30 seconds)
 * Prevents connections from being held indefinitely
 */
const DEFAULT_TRANSACTION_TIMEOUT = 30000;

/**
 * Timeout error class for transaction timeouts
 */
export class TransactionTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Transaction exceeded timeout of ${timeoutMs}ms`);
    this.name = 'TransactionTimeoutError';
  }
}

/**
 * Execute a callback within a database transaction with timeout protection
 * Automatically rolls back on error, commits on success
 *
 * @param callback - Async function receiving a database client
 * @param timeoutMs - Maximum transaction duration in milliseconds (default: 30s)
 * @returns Result from the callback
 * @throws TransactionTimeoutError if transaction exceeds timeout
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>,
  timeoutMs: number = DEFAULT_TRANSACTION_TIMEOUT
): Promise<T> {
  const client = await db.getClient();
  let timeoutId: NodeJS.Timeout | null = null;
  let isTimedOut = false;

  try {
    await client.query('BEGIN');

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        isTimedOut = true;
        reject(new TransactionTimeoutError(timeoutMs));
      }, timeoutMs);
    });

    // Race between callback and timeout
    const result = await Promise.race([
      callback(client),
      timeoutPromise
    ]);

    // Clear timeout if callback completed first
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    await client.query('COMMIT');
    return result as T;
  } catch (error) {
    // Only attempt rollback if not timed out
    // (timed out connections will be terminated by idle_in_transaction_session_timeout)
    if (!isTimedOut) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('[DB] Rollback failed:', rollbackError);
      }
    }
    throw error;
  } finally {
    // Always clear timeout and release client
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    try {
      client.release();
    } catch (releaseError) {
      console.error('[DB] Client release failed:', releaseError);
    }
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

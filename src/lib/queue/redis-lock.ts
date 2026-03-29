/**
 * Redis Distributed Lock Utility
 *
 * Provides distributed locking mechanism using Redis SET NX EX commands.
 * Used to prevent race conditions in multi-worker scenarios where multiple
 * workers might simultaneously try to perform the same operation (e.g.,
 * transitioning job state when the last scene completes).
 *
 * Why Redis locks instead of PostgreSQL advisory locks:
 * - PostgreSQL advisory locks are per-connection and don't span transactions
 * - Redis locks work across multiple processes and transactions
 * - Better for orchestration logic that involves multiple steps (query → state transition → queue operation)
 */

import { redisConnection } from './index';

interface RedisLockOptions {
  /** Lock timeout in milliseconds (default: 5000) */
  timeout?: number;
  /** Number of retry attempts if lock is held (default: 0 - no retries) */
  retries?: number;
  /** Delay between retries in milliseconds (default: 100) */
  retryDelay?: number;
}

/**
 * Executes a callback function while holding a distributed Redis lock.
 *
 * @param lockKey - Unique identifier for the lock (e.g., "job:uuid:completion_check")
 * @param callback - Async function to execute while holding the lock
 * @param options - Lock configuration options
 * @returns Result of the callback, or null if lock acquisition failed
 *
 * @example
 * ```typescript
 * const result = await withRedisLock(
 *   `job:${jobId}:completion_check`,
 *   async () => {
 *     // Critical section - only one worker executes this
 *     const count = await checkCompletion();
 *     if (count === total) {
 *       await transitionState();
 *       await queueNextStep();
 *     }
 *     return { success: true };
 *   },
 *   { timeout: 5000 }
 * );
 *
 * if (!result) {
 *   console.log('Another worker is handling this operation');
 * }
 * ```
 */
export async function withRedisLock<T>(
  lockKey: string,
  callback: () => Promise<T>,
  options: RedisLockOptions = {}
): Promise<T | null> {
  const { timeout = 5000, retries = 0, retryDelay = 100 } = options;

  // Convert timeout to seconds for Redis EX command
  const timeoutInSeconds = Math.ceil(timeout / 1000);

  let attempt = 0;
  while (attempt <= retries) {
    try {
      // Try to acquire lock using SET NX EX (set if not exists with expiry)
      // Returns "OK" if lock acquired, null if lock already held
      const lockAcquired = await redisConnection.set(
        lockKey,
        Date.now().toString(), // Store timestamp as lock value
        'EX', // Set expiry
        timeoutInSeconds,
        'NX' // Only set if not exists
      );

      if (lockAcquired === 'OK') {
        // Lock acquired successfully
        console.log(`🔒 [Redis Lock] Acquired: ${lockKey} (timeout: ${timeout}ms)`);

        try {
          // Execute the critical section
          const result = await callback();

          // Release lock immediately after success
          await redisConnection.del(lockKey);
          console.log(`🔓 [Redis Lock] Released: ${lockKey}`);

          return result;
        } catch (error) {
          // Release lock even on error
          await redisConnection.del(lockKey);
          console.log(`🔓 [Redis Lock] Released (after error): ${lockKey}`);
          throw error;
        }
      } else {
        // Lock is held by another worker
        if (attempt < retries) {
          console.log(
            `⏳ [Redis Lock] Lock held by another worker: ${lockKey} (attempt ${attempt + 1}/${retries + 1})`
          );
          attempt++;
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          continue;
        } else {
          console.log(`❌ [Redis Lock] Could not acquire lock: ${lockKey} (held by another worker)`);
          return null;
        }
      }
    } catch (error) {
      console.error(`❌ [Redis Lock] Error acquiring lock ${lockKey}:`, error);
      throw error;
    }
  }

  // Should never reach here, but TypeScript needs it
  return null;
}

/**
 * Checks if a lock is currently held
 *
 * @param lockKey - Lock identifier to check
 * @returns true if lock exists, false otherwise
 */
export async function isLockHeld(lockKey: string): Promise<boolean> {
  const exists = await redisConnection.exists(lockKey);
  return exists === 1;
}

/**
 * Forcefully releases a lock (use with caution!)
 *
 * @param lockKey - Lock identifier to release
 * @returns true if lock was deleted, false if it didn't exist
 */
export async function forceReleaseLock(lockKey: string): Promise<boolean> {
  const deleted = await redisConnection.del(lockKey);
  return deleted === 1;
}

/**
 * CRITICAL FIX #11: Detect potentially stale locks
 *
 * A lock is considered stale if:
 * - It has existed for longer than expected (> maxAgeMs)
 * - This could indicate a crashed worker that never released the lock
 *
 * @param lockKey - Lock identifier to check
 * @param maxAgeMs - Maximum expected lock age in milliseconds (default: 60000 = 1 minute)
 * @returns Object with staleness info and lock age
 */
export async function checkStaleLock(lockKey: string, maxAgeMs: number = 60000): Promise<{
  isStale: boolean;
  ageMs: number | null;
  exists: boolean;
}> {
  try {
    const lockValue = await redisConnection.get(lockKey);

    if (!lockValue) {
      return { isStale: false, ageMs: null, exists: false };
    }

    // Lock value contains timestamp when lock was acquired
    const lockTimestamp = parseInt(lockValue, 10);
    const currentTime = Date.now();
    const ageMs = currentTime - lockTimestamp;

    const isStale = ageMs > maxAgeMs;

    if (isStale) {
      console.warn(
        `⚠️  [Redis Lock] Potentially stale lock detected: ${lockKey} (age: ${(ageMs / 1000).toFixed(1)}s)`
      );
    }

    return { isStale, ageMs, exists: true };
  } catch (error) {
    console.error(`❌ [Redis Lock] Error checking stale lock ${lockKey}:`, error);
    return { isStale: false, ageMs: null, exists: false };
  }
}

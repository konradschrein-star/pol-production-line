/**
 * Auto Restarter - Automatic service recovery with exponential backoff
 *
 * Features:
 * - Exponential backoff: 1s → 2s → 5s → 10s → 30s (max)
 * - Rate limiting: Max 5 restarts per minute per service
 * - Restart tracking and metrics
 * - Event emission for monitoring integration
 *
 * CRITICAL: ServiceManager MUST listen to restart events and show notifications.
 * Silent auto-restarts can mask serious problems - user MUST be informed.
 */

import { EventEmitter } from 'events';
import logger from '../logger';

export interface RestartState {
  service: string;
  restartCount: number;
  lastRestart: Date | null;
  backoffLevel: number; // 0-4 (1s, 2s, 5s, 10s, 30s)
  recentRestarts: Date[]; // For rate limiting (last minute)
}

const BACKOFF_DELAYS = [1000, 2000, 5000, 10000, 30000]; // milliseconds
const MAX_RESTARTS_PER_MINUTE = 5;

/**
 * AutoRestarter manages automatic service recovery with intelligent backoff
 */
export class AutoRestarter extends EventEmitter {
  private state: Map<string, RestartState> = new Map();
  private restartCallbacks: Map<string, () => Promise<void>> = new Map();
  private pendingRestarts: Set<string> = new Set(); // Prevent concurrent restarts

  /**
   * Register a service with its restart callback
   */
  registerService(service: string, restartFn: () => Promise<void>): void {
    this.restartCallbacks.set(service, restartFn);
    this.state.set(service, {
      service,
      restartCount: 0,
      lastRestart: null,
      backoffLevel: 0,
      recentRestarts: [],
    });
    logger.debug(`Registered service: ${service}`, 'auto-restart');
  }

  /**
   * Attempt to restart a service with backoff and rate limiting
   */
  async restart(service: string): Promise<void> {
    const state = this.state.get(service);
    const restartFn = this.restartCallbacks.get(service);

    if (!state || !restartFn) {
      logger.error(`Service not registered: ${service}`, 'auto-restart');
      return;
    }

    // Prevent concurrent restarts of the same service
    if (this.pendingRestarts.has(service)) {
      logger.warn(`Restart already in progress for ${service}, skipping`, 'auto-restart');
      return;
    }

    // Rate limiting check
    const now = new Date();
    state.recentRestarts = state.recentRestarts.filter(
      (date) => now.getTime() - date.getTime() < 60000 // Last minute
    );

    if (state.recentRestarts.length >= MAX_RESTARTS_PER_MINUTE) {
      const retryInSeconds = this.getTimeUntilRateLimitReset(service);
      logger.error(
        `Rate limit exceeded for ${service} (${state.recentRestarts.length} restarts in last minute). Retrying in ${retryInSeconds}s`,
        'auto-restart'
      );
      this.emit('restart:rate-limited', service, state);

      // Schedule retry after rate limit window expires
      setTimeout(() => {
        logger.info(`Rate limit window expired for ${service}, retrying restart`, 'auto-restart');
        this.restart(service);
      }, retryInSeconds * 1000);

      return;
    }

    // Calculate backoff delay
    const delay = BACKOFF_DELAYS[state.backoffLevel] || BACKOFF_DELAYS[BACKOFF_DELAYS.length - 1];
    logger.info(
      `Restarting ${service} in ${delay}ms (backoff level ${state.backoffLevel}, attempt ${state.restartCount + 1})`,
      'auto-restart'
    );

    // Wait for backoff delay
    await new Promise((resolve) => setTimeout(resolve, delay));

    this.pendingRestarts.add(service);

    try {
      this.emit('restart:starting', service, state);
      await restartFn();

      // Update state on success
      state.restartCount++;
      state.lastRestart = now;
      state.recentRestarts.push(now);
      state.backoffLevel = Math.min(state.backoffLevel + 1, BACKOFF_DELAYS.length - 1);

      logger.info(`${service} restarted successfully (total restarts: ${state.restartCount})`, 'auto-restart');
      this.emit('restart:success', service, state);
    } catch (err: any) {
      logger.error(`Failed to restart ${service}: ${err.message}`, 'auto-restart');
      this.emit('restart:failed', service, state, err);
    } finally {
      this.pendingRestarts.delete(service);
    }
  }

  /**
   * Reset backoff level for a service (called when service is manually restarted or stable)
   */
  resetBackoff(service: string): void {
    const state = this.state.get(service);
    if (state) {
      state.backoffLevel = 0;
      logger.debug(`Reset backoff for ${service}`, 'auto-restart');
    }
  }

  /**
   * Clear restart history for a service (useful after manual intervention)
   */
  clearHistory(service: string): void {
    const state = this.state.get(service);
    if (state) {
      state.recentRestarts = [];
      state.restartCount = 0;
      state.backoffLevel = 0;
      logger.info(`Cleared restart history for ${service}`, 'auto-restart');
    }
  }

  /**
   * Get restart state for a service
   */
  getState(service: string): RestartState | undefined {
    return this.state.get(service);
  }

  /**
   * Get all restart states
   */
  getAllStates(): RestartState[] {
    return Array.from(this.state.values());
  }

  /**
   * Check if a service is at rate limit
   */
  isRateLimited(service: string): boolean {
    const state = this.state.get(service);
    if (!state) return false;

    const now = new Date();
    const recentRestarts = state.recentRestarts.filter(
      (date) => now.getTime() - date.getTime() < 60000
    );

    return recentRestarts.length >= MAX_RESTARTS_PER_MINUTE;
  }

  /**
   * Get time until rate limit resets (in seconds)
   */
  getTimeUntilRateLimitReset(service: string): number {
    const state = this.state.get(service);
    if (!state || state.recentRestarts.length === 0) return 0;

    const now = Date.now();
    const oldestRestart = state.recentRestarts[0].getTime();
    const timeSinceOldest = now - oldestRestart;
    const timeRemaining = Math.max(0, 60000 - timeSinceOldest);

    return Math.ceil(timeRemaining / 1000);
  }
}

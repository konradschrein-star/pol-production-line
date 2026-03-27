/**
 * Adaptive Rate Limiter for Whisk API
 *
 * Dynamically adjusts concurrency based on success/failure patterns:
 * - Starts at minConcurrency (default: 2)
 * - Increases gradually on success streaks
 * - Decreases aggressively on rate limit errors
 */

export class AdaptiveRateLimiter {
  private concurrency: number;
  private successStreak: number = 0;
  private failureStreak: number = 0;
  private readonly minConcurrency: number;
  private readonly maxConcurrency: number;
  private readonly increaseThreshold: number = 5; // Successful requests before increasing
  private readonly decreaseThreshold: number = 2; // Rate limits before decreasing

  constructor(options?: {
    minConcurrency?: number;
    maxConcurrency?: number;
    initialConcurrency?: number;
  }) {
    this.minConcurrency = options?.minConcurrency || 2;
    this.maxConcurrency = options?.maxConcurrency || 5;
    this.concurrency = options?.initialConcurrency || this.minConcurrency;
  }

  /**
   * Record a successful API call
   * Gradually increases concurrency on success streaks
   */
  onSuccess(): void {
    this.successStreak++;
    this.failureStreak = 0;

    // Increase concurrency after threshold successful requests
    if (
      this.successStreak >= this.increaseThreshold &&
      this.concurrency < this.maxConcurrency
    ) {
      this.concurrency++;
      console.log(`📈 [RateLimiter] Increased concurrency to ${this.concurrency} (success streak: ${this.successStreak})`);
      this.successStreak = 0; // Reset after increase
    }
  }

  /**
   * Record a rate limit error (429)
   * Aggressively decreases concurrency
   */
  onRateLimit(): void {
    this.failureStreak++;
    this.successStreak = 0;

    // Decrease concurrency after threshold rate limits
    if (
      this.failureStreak >= this.decreaseThreshold &&
      this.concurrency > this.minConcurrency
    ) {
      this.concurrency--;
      console.log(`📉 [RateLimiter] Decreased concurrency to ${this.concurrency} (rate limit streak: ${this.failureStreak})`);
      this.failureStreak = 0; // Reset after decrease
    } else if (this.failureStreak >= this.decreaseThreshold) {
      console.warn(`⚠️  [RateLimiter] Already at minimum concurrency (${this.minConcurrency}), cannot decrease further`);
    }
  }

  /**
   * Record a non-rate-limit error
   * Resets success streak but doesn't affect concurrency
   */
  onError(): void {
    this.successStreak = 0;
    // Don't modify concurrency for non-rate-limit errors
  }

  /**
   * Get current concurrency level
   */
  getConcurrency(): number {
    return this.concurrency;
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.concurrency = this.minConcurrency;
    this.successStreak = 0;
    this.failureStreak = 0;
    console.log(`🔄 [RateLimiter] Reset to initial concurrency: ${this.concurrency}`);
  }

  /**
   * Get current statistics
   */
  getStats(): {
    concurrency: number;
    successStreak: number;
    failureStreak: number;
    min: number;
    max: number;
  } {
    return {
      concurrency: this.concurrency,
      successStreak: this.successStreak,
      failureStreak: this.failureStreak,
      min: this.minConcurrency,
      max: this.maxConcurrency,
    };
  }
}

/**
 * Calculate exponential backoff delay
 * @param attemptNumber - Number of retry attempts (0-indexed)
 * @param baseDelay - Base delay in milliseconds (default: 5000ms = 5s)
 * @param maxDelay - Maximum delay in milliseconds (default: 60000ms = 60s)
 * @returns Delay in milliseconds
 */
export function calculateBackoff(
  attemptNumber: number,
  baseDelay: number = 5000,
  maxDelay: number = 60000
): number {
  const delay = Math.min(baseDelay * Math.pow(2, attemptNumber), maxDelay);
  return delay;
}

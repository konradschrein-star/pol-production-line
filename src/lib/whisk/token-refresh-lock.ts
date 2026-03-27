/**
 * Token Refresh Lock - Prevents concurrent token refresh operations
 *
 * Ensures only one browser instance launches at a time when multiple
 * workers detect expired tokens simultaneously.
 *
 * Simple in-memory implementation (sufficient for single-machine deployment)
 */

const REFRESH_TIMEOUT_MS = 60000; // 60 seconds max for refresh operation

export class TokenRefreshLock {
  private static isRefreshing = false;
  private static refreshPromise: Promise<string> | null = null;
  private static timeoutHandle: NodeJS.Timeout | null = null;

  /**
   * Acquire lock and execute refresh function
   * If refresh is already in progress, wait for it to complete
   *
   * @param refreshFn Function that performs the token refresh
   * @returns New token string
   */
  static async refresh(refreshFn: () => Promise<string>): Promise<string> {
    // If another refresh is in progress, wait for it
    if (this.isRefreshing && this.refreshPromise) {
      console.log('⏳ [Token Refresh Lock] Waiting for in-progress refresh...');

      try {
        const token = await this.refreshPromise;
        console.log('✅ [Token Refresh Lock] Reusing token from concurrent refresh');
        return token;
      } catch (error) {
        console.error('❌ [Token Refresh Lock] Concurrent refresh failed:', error);
        throw error;
      }
    }

    // Acquire lock
    console.log('🔒 [Token Refresh Lock] Acquiring lock for token refresh');
    this.isRefreshing = true;

    // Set timeout to prevent indefinite locks
    this.timeoutHandle = setTimeout(() => {
      if (this.isRefreshing) {
        console.error('⏱️  [Token Refresh Lock] Refresh timeout - forcing lock release');
        this.release();
      }
    }, REFRESH_TIMEOUT_MS);

    // Execute refresh
    this.refreshPromise = (async () => {
      try {
        const token = await refreshFn();
        return token;
      } catch (error) {
        console.error('❌ [Token Refresh Lock] Refresh failed:', error);
        throw error;
      } finally {
        this.release();
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Release the lock
   */
  private static release(): void {
    console.log('🔓 [Token Refresh Lock] Releasing lock');

    this.isRefreshing = false;
    this.refreshPromise = null;

    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
  }

  /**
   * Check if refresh is currently in progress (for debugging/monitoring)
   */
  static isLocked(): boolean {
    return this.isRefreshing;
  }
}

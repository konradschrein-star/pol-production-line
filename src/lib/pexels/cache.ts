/**
 * Pexels SDK Cache
 * In-memory caching for search results to reduce API calls
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface CacheOptions {
  /** Time-to-live in milliseconds (default: 1 hour) */
  ttl?: number;
  /** Maximum cache size (default: 100 entries) */
  maxSize?: number;
}

export class Cache<T = any> {
  private store = new Map<string, CacheEntry<T>>();
  private ttl: number;
  private maxSize: number;

  constructor(options: CacheOptions = {}) {
    this.ttl = options.ttl || 3600000; // 1 hour default
    this.maxSize = options.maxSize || 100;
  }

  /**
   * Get value from cache
   */
  get(key: string): T | null {
    const entry = this.store.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T, customTtl?: number): void {
    const ttl = customTtl || this.ttl;
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    };

    // Evict oldest entries if cache is full
    if (this.store.size >= this.maxSize) {
      this.evictOldest();
    }

    this.store.set(key, entry);
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete entry from cache
   */
  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get cache statistics
   */
  stats() {
    let expired = 0;
    const now = Date.now();

    for (const entry of this.store.values()) {
      if (now > entry.expiresAt) {
        expired++;
      }
    }

    return {
      size: this.store.size,
      maxSize: this.maxSize,
      expired,
      valid: this.store.size - expired,
    };
  }

  /**
   * Evict oldest entry
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.store.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.store.delete(oldestKey);
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        removed++;
      }
    }

    return removed;
  }
}

/**
 * Create cache key from search parameters
 */
export function createCacheKey(params: Record<string, any>): string {
  const sorted = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return sorted;
}

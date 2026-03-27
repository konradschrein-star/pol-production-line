/**
 * Pexels SDK Client (Modular Version)
 * Production-ready, reusable Pexels API client with caching, error handling, and logging
 */

import axios, { AxiosInstance } from 'axios';
import {
  PexelsVideoSearchRequest,
  PexelsSearchResponse,
  PexelsVideo,
  PexelsSelectedVideo,
  PexelsRateLimitStatus,
  PexelsPhotoSearchRequest,
  PexelsPhotoSearchResponse,
} from './types';
import { PexelsConfig, mergeConfig, validateConfig } from './config';
import {
  PexelsAuthError,
  PexelsRateLimitError,
  PexelsNotFoundError,
  PexelsNetworkError,
  PexelsValidationError,
} from './errors';
import { Logger, createLogger } from './logger';
import { Cache, createCacheKey } from './cache';

export interface PexelsClientOptions extends Partial<PexelsConfig> {
  /** Enable caching of search results */
  enableCache?: boolean;
  /** Cache TTL in milliseconds */
  cacheTtl?: number;
}

export class PexelsClient {
  private config: PexelsConfig;
  private logger: Logger;
  private axios: AxiosInstance;
  private cache: Cache<PexelsSearchResponse | PexelsPhotoSearchResponse>;
  private requestCount = 0;
  private resetTime: Date | null = null;
  private enableCache: boolean;

  constructor(options: PexelsClientOptions) {
    this.config = mergeConfig(options);
    validateConfig(this.config);

    this.logger = createLogger(this.config);
    this.enableCache = options.enableCache ?? true;

    this.cache = new Cache({
      ttl: options.cacheTtl || 3600000, // 1 hour default
      maxSize: 100,
    });

    this.axios = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        Authorization: this.config.apiKey,
      },
    });

    // Set up axios interceptors for logging
    this.setupInterceptors();
  }

  /**
   * Search for videos
   */
  async searchVideos(request: PexelsVideoSearchRequest): Promise<PexelsSearchResponse> {
    this.validateSearchRequest(request);
    this.checkRateLimit();

    const params = this.buildSearchParams(request);
    const cacheKey = this.enableCache ? createCacheKey({ type: 'video', ...params }) : null;

    // Check cache
    if (cacheKey) {
      const cached = this.cache.get(cacheKey) as PexelsSearchResponse | null;
      if (cached) {
        this.logger.info(`Cache hit for query: "${request.query}"`);
        return cached;
      }
    }

    try {
      const response = await this.axios.get<PexelsSearchResponse>('/videos/search', {
        params,
      });

      this.trackRequest();
      this.logRateLimitHeaders(response.headers);

      this.logger.info(`Found ${response.data.total_results} videos for "${request.query}"`);

      // Cache the result
      if (cacheKey) {
        this.cache.set(cacheKey, response.data);
      }

      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Search for photos
   */
  async searchPhotos(request: PexelsPhotoSearchRequest): Promise<PexelsPhotoSearchResponse> {
    this.validateSearchRequest(request);
    this.checkRateLimit();

    const params = this.buildSearchParams(request);
    const cacheKey = this.enableCache ? createCacheKey({ type: 'photo', ...params }) : null;

    // Check cache
    if (cacheKey) {
      const cached = this.cache.get(cacheKey) as PexelsPhotoSearchResponse | null;
      if (cached) {
        this.logger.info(`Cache hit for query: "${request.query}"`);
        return cached;
      }
    }

    try {
      const response = await this.axios.get<PexelsPhotoSearchResponse>('/v1/search', {
        params,
      });

      this.trackRequest();
      this.logRateLimitHeaders(response.headers);

      this.logger.info(`Found ${response.data.total_results} photos for "${request.query}"`);

      // Cache the result
      if (cacheKey) {
        this.cache.set(cacheKey, response.data);
      }

      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Select best video from search results using scoring algorithm
   */
  selectBestVideo(videos: PexelsVideo[]): PexelsSelectedVideo | null {
    if (videos.length === 0) {
      this.logger.warn('No videos to select from');
      return null;
    }

    const scored = videos.map((video) => {
      let score = 0;

      // Find HD file (1920x1080)
      const hdFile = video.video_files.find(
        (f) => f.quality === 'hd' && f.width === 1920 && f.height === 1080
      );

      if (!hdFile) {
        // Fallback to any HD file
        const anyHD = video.video_files.find((f) => f.quality === 'hd');
        if (!anyHD) {
          return { video, file: video.video_files[0], score: 0 };
        }

        score += 50; // Not perfect resolution
        return { video, file: anyHD, score };
      }

      score += 100; // Perfect resolution (1920x1080)

      // Prefer 5-30 second duration
      const minDuration = this.config.defaults?.minDuration || 5;
      const maxDuration = this.config.defaults?.maxDuration || 30;

      if (video.duration >= minDuration && video.duration <= maxDuration) {
        score += 50;
      } else if (video.duration < minDuration) {
        score += 20; // Too short
      } else {
        score += 10; // Too long
      }

      // Prefer landscape orientation (16:9)
      if (hdFile.width / hdFile.height >= 1.7) {
        score += 30;
      }

      return { video, file: hdFile, score };
    });

    // Sort by score (highest first)
    scored.sort((a, b) => b.score - a.score);

    const best = scored[0];

    this.logger.info(
      `Selected video #${best.video.id} (score: ${best.score}, ${best.file.width}x${best.file.height}, ${best.video.duration}s)`
    );

    return {
      videoId: best.video.id,
      downloadUrl: best.file.link,
      resolution: `${best.file.width}x${best.file.height}`,
      duration: best.video.duration,
      quality: best.file.quality,
      fps: best.file.fps,
    };
  }

  /**
   * Download video file
   */
  async downloadVideo(url: string, onProgress?: (percent: number) => void): Promise<Buffer> {
    this.checkRateLimit();

    this.logger.info(`Downloading video from ${url}`);

    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 120000, // 2 minutes for large files
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            if (onProgress) {
              onProgress(percent);
            }
          }
        },
      });

      this.trackRequest();

      const sizeInMB = (response.data.byteLength / 1024 / 1024).toFixed(1);
      this.logger.info(`Downloaded ${sizeInMB} MB`);

      return Buffer.from(response.data);
    } catch (error: any) {
      throw new PexelsNetworkError(`Failed to download video: ${error.message}`, error);
    }
  }

  /**
   * Download photo file
   */
  async downloadPhoto(url: string, onProgress?: (percent: number) => void): Promise<Buffer> {
    this.checkRateLimit();

    this.logger.info(`Downloading photo from ${url}`);

    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 60000, // 1 minute for photos
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            if (onProgress) {
              onProgress(percent);
            }
          }
        },
      });

      this.trackRequest();

      const sizeInMB = (response.data.byteLength / 1024 / 1024).toFixed(1);
      this.logger.info(`Downloaded ${sizeInMB} MB`);

      return Buffer.from(response.data);
    } catch (error: any) {
      throw new PexelsNetworkError(`Failed to download photo: ${error.message}`, error);
    }
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(): PexelsRateLimitStatus {
    const now = new Date();

    // Reset counter if hour has passed
    if (this.resetTime && now > this.resetTime) {
      this.requestCount = 0;
      this.resetTime = null;
    }

    // Calculate minutes until reset
    let resetInMinutes = 60;
    if (this.resetTime) {
      resetInMinutes = Math.ceil((this.resetTime.getTime() - now.getTime()) / 1000 / 60);
    }

    return {
      used: this.requestCount,
      limit: this.config.rateLimitPerHour!,
      resetInMinutes,
    };
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.stats();
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.info('Cache cleared');
  }

  /**
   * Clean up expired cache entries
   */
  cleanupCache(): number {
    const removed = this.cache.cleanup();
    this.logger.info(`Cleaned up ${removed} expired cache entries`);
    return removed;
  }

  // Private methods

  private setupInterceptors(): void {
    this.axios.interceptors.request.use(
      (config) => {
        this.logger.debug(`Request: ${config.method?.toUpperCase()} ${config.url}`, config.params);
        return config;
      },
      (error) => {
        this.logger.error('Request error', error);
        return Promise.reject(error);
      }
    );

    this.axios.interceptors.response.use(
      (response) => {
        this.logger.debug(`Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        this.logger.error('Response error', error.response?.data);
        return Promise.reject(error);
      }
    );
  }

  private buildSearchParams(request: any): Record<string, string> {
    const params: Record<string, string> = {
      query: request.query,
      per_page: (request.per_page || this.config.defaults?.perPage || 15).toString(),
      page: (request.page || 1).toString(),
    };

    if (request.orientation) params.orientation = request.orientation;
    if (request.size) params.size = request.size;
    if (request.locale) params.locale = request.locale;
    if (request.color) params.color = request.color;

    // Video-specific params
    if (request.min_duration) {
      params.min_duration = request.min_duration.toString();
    }
    if (request.max_duration) {
      params.max_duration = request.max_duration.toString();
    }

    return params;
  }

  private validateSearchRequest(request: any): void {
    if (!request.query || typeof request.query !== 'string' || request.query.trim() === '') {
      throw new PexelsValidationError('Search query is required and must be a non-empty string', 'query');
    }

    if (request.per_page && (request.per_page < 1 || request.per_page > 80)) {
      throw new PexelsValidationError('per_page must be between 1 and 80', 'per_page');
    }

    if (request.page && request.page < 1) {
      throw new PexelsValidationError('page must be >= 1', 'page');
    }
  }

  private checkRateLimit(): void {
    const status = this.getRateLimitStatus();

    if (this.requestCount >= this.config.rateLimitPerHour!) {
      throw new PexelsRateLimitError(
        `Rate limit exceeded (${this.requestCount}/${this.config.rateLimitPerHour!}). Reset in ${status.resetInMinutes} minutes.`,
        this.resetTime || new Date(),
        this.config.rateLimitPerHour!,
        status.used
      );
    }
  }

  private trackRequest(): void {
    if (!this.resetTime) {
      this.resetTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    }
    this.requestCount++;

    if (this.requestCount >= 180) {
      this.logger.warn(
        `WARNING: ${this.requestCount}/${this.config.rateLimitPerHour!} requests used`
      );
    }
  }

  private logRateLimitHeaders(headers: any): void {
    const remaining = headers['x-ratelimit-remaining'];
    const limit = headers['x-ratelimit-limit'];
    const reset = headers['x-ratelimit-reset'];

    if (remaining !== undefined) {
      const resetDate = new Date(parseInt(reset) * 1000);
      this.logger.info(
        `Rate limit: ${remaining}/${limit} remaining (resets: ${resetDate.toLocaleTimeString()})`
      );
    }
  }

  private handleError(error: any): Error {
    if (error.response) {
      const status = error.response.status;

      if (status === 401) {
        return new PexelsAuthError('Invalid API key', error.response.data);
      }

      if (status === 429) {
        const resetHeader = error.response.headers['x-ratelimit-reset'];
        const resetTime = resetHeader ? new Date(parseInt(resetHeader) * 1000) : new Date();
        const remaining = error.response.headers['x-ratelimit-remaining'] || 0;
        const limit = error.response.headers['x-ratelimit-limit'] || this.config.rateLimitPerHour!;

        return new PexelsRateLimitError(
          'API rate limit exceeded',
          resetTime,
          limit,
          remaining
        );
      }

      if (status === 404) {
        return new PexelsNotFoundError('Resource not found', error.response.data);
      }
    }

    if (error.request) {
      return new PexelsNetworkError('Network error: no response received', error);
    }

    return new PexelsNetworkError(error.message, error);
  }
}

/**
 * Create Pexels client from environment variables
 */
export function createPexelsClient(options: Partial<PexelsClientOptions> = {}): PexelsClient {
  const apiKey = options.apiKey || process.env.PEXELS_API_KEY;

  if (!apiKey) {
    throw new Error('PEXELS_API_KEY environment variable is required');
  }

  return new PexelsClient({
    apiKey,
    ...options,
  });
}

import axios from 'axios';
import {
  PexelsVideoSearchRequest,
  PexelsSearchResponse,
  PexelsVideo,
  PexelsSelectedVideo,
  PexelsRateLimitStatus
} from './types';

/**
 * Pexels Video API Client
 * API Docs: https://www.pexels.com/api/documentation/#videos-search
 */

export class PexelsAPIClient {
  private apiKey: string;
  private baseUrl = 'https://api.pexels.com';
  private requestCount = 0;
  private resetTime: Date | null = null;
  private readonly REQUEST_LIMIT = 200; // per hour

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Pexels API key is required. Get one at: https://www.pexels.com/api/');
    }
    this.apiKey = apiKey;
  }

  /**
   * Search for videos matching query
   */
  async searchVideos(request: PexelsVideoSearchRequest): Promise<PexelsSearchResponse> {
    this.checkRateLimit();

    const params = new URLSearchParams({
      query: request.query,
      per_page: (request.per_page || 15).toString(),
      page: (request.page || 1).toString()
    });

    if (request.orientation) params.append('orientation', request.orientation);
    if (request.size) params.append('size', request.size);
    if (request.min_duration) params.append('min_duration', request.min_duration.toString());
    if (request.max_duration) params.append('max_duration', request.max_duration.toString());

    try {
      const response = await axios.get(`${this.baseUrl}/videos/search?${params}`, {
        headers: {
          'Authorization': this.apiKey
        },
        timeout: 30000
      });

      this.trackRequest();

      // Log rate limit headers from API response
      const rateLimitRemaining = response.headers['x-ratelimit-remaining'];
      const rateLimitLimit = response.headers['x-ratelimit-limit'];
      const rateLimitReset = response.headers['x-ratelimit-reset'];

      if (rateLimitRemaining !== undefined) {
        console.log(`[Pexels] Rate limit: ${rateLimitRemaining}/${rateLimitLimit} requests remaining (resets: ${new Date(parseInt(rateLimitReset) * 1000).toLocaleTimeString()})`);
      }

      console.log(`[Pexels] Search found ${response.data.total_results} results for "${request.query}"`);

      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Invalid Pexels API key. Please check your .env file.');
      }
      if (error.response?.status === 429) {
        throw new Error('Pexels API rate limit exceeded. Wait 1 hour before retrying.');
      }
      throw new Error(`Pexels API error: ${error.message}`);
    }
  }

  /**
   * Select best video from search results
   * Priority: HD quality (1920x1080) > duration 5-30s > landscape orientation
   */
  selectBestVideo(videos: PexelsVideo[]): PexelsSelectedVideo | null {
    if (videos.length === 0) return null;

    // Score each video
    const scored = videos.map(video => {
      let score = 0;

      // Find HD file
      const hdFile = video.video_files.find(f =>
        f.quality === 'hd' && f.width === 1920 && f.height === 1080
      );

      if (!hdFile) {
        // Fallback to any HD file
        const anyHD = video.video_files.find(f => f.quality === 'hd');
        if (!anyHD) return { video, file: video.video_files[0], score: 0 };

        score += 50; // Not perfect resolution
        return { video, file: anyHD, score };
      }

      score += 100; // Perfect resolution

      // Prefer 5-30 second duration
      if (video.duration >= 5 && video.duration <= 30) {
        score += 50;
      } else if (video.duration < 5) {
        score += 20; // Too short
      } else {
        score += 10; // Too long
      }

      // Prefer landscape (16:9)
      if (hdFile.width / hdFile.height >= 1.7) {
        score += 30;
      }

      return { video, file: hdFile, score };
    });

    // Sort by score (highest first)
    scored.sort((a, b) => b.score - a.score);

    const best = scored[0];

    console.log(`[Pexels] Selected video #${best.video.id} (score: ${best.score}, ${best.file.width}x${best.file.height}, ${best.video.duration}s)`);

    return {
      videoId: best.video.id,
      downloadUrl: best.file.link,
      resolution: `${best.file.width}x${best.file.height}`,
      duration: best.video.duration,
      quality: best.file.quality,
      fps: best.file.fps
    };
  }

  /**
   * Download video file
   * @returns Buffer containing video data
   */
  async downloadVideo(url: string): Promise<Buffer> {
    this.checkRateLimit();

    console.log(`[Pexels] Downloading video from ${url}...`);

    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 120000, // 2 minutes for large files
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            if (percent % 25 === 0) {
              console.log(`[Pexels] Download progress: ${percent}%`);
            }
          }
        }
      });

      this.trackRequest();

      const sizeInMB = (response.data.byteLength / 1024 / 1024).toFixed(1);
      console.log(`[Pexels] Downloaded ${sizeInMB} MB`);

      return Buffer.from(response.data);
    } catch (error: any) {
      throw new Error(`Failed to download video: ${error.message}`);
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
      limit: this.REQUEST_LIMIT,
      resetInMinutes
    };
  }

  /**
   * Track API request for rate limiting
   */
  private trackRequest() {
    if (!this.resetTime) {
      this.resetTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    }
    this.requestCount++;

    if (this.requestCount >= 180) {
      console.warn(`[Pexels] WARNING: ${this.requestCount}/${this.REQUEST_LIMIT} requests used`);
    }
  }

  /**
   * Check if rate limit would be exceeded
   */
  private checkRateLimit() {
    if (this.requestCount >= this.REQUEST_LIMIT) {
      const status = this.getRateLimitStatus();
      throw new Error(`Pexels API rate limit exceeded (${this.requestCount}/${this.REQUEST_LIMIT}). Reset in ${status.resetInMinutes} minutes.`);
    }
  }
}

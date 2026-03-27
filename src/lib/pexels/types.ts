/**
 * Pexels Video API Type Definitions
 * API Docs: https://www.pexels.com/api/documentation/#videos
 */

export interface PexelsVideoSearchRequest {
  query: string;
  orientation?: 'landscape' | 'portrait' | 'square';
  size?: 'large' | 'medium' | 'small';
  per_page?: number; // Max 80
  page?: number;
  min_duration?: number; // seconds
  max_duration?: number; // seconds
}

export interface PexelsVideoFile {
  id: number;
  quality: 'hd' | 'sd' | 'uhd';
  file_type: 'video/mp4';
  width: number;
  height: number;
  fps: number;
  link: string; // Download URL
}

export interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  duration: number; // seconds
  image: string; // Thumbnail URL
  url: string; // Pexels video page URL
  video_files: PexelsVideoFile[];
  video_pictures: Array<{
    id: number;
    picture: string;
    nr: number;
  }>;
}

export interface PexelsSearchResponse {
  page: number;
  per_page: number;
  total_results: number;
  url: string;
  videos: PexelsVideo[];
  next_page?: string;
}

export interface PexelsSelectedVideo {
  videoId: number;
  downloadUrl: string;
  resolution: string; // e.g., "1920x1080"
  duration: number; // seconds
  quality: 'hd' | 'sd' | 'uhd';
  fps: number;
}

export interface PexelsRateLimitStatus {
  used: number;
  limit: number; // 200 per hour
  resetInMinutes: number;
}

// ============================================
// PHOTO API TYPES
// ============================================

export interface PexelsPhotoSearchRequest {
  query: string;
  orientation?: 'landscape' | 'portrait' | 'square';
  size?: 'large' | 'medium' | 'small';
  color?: string; // Color filter (e.g., 'red', 'blue', '#ffffff')
  locale?: string; // Language code (e.g., 'en-US')
  page?: number;
  per_page?: number; // Max 80
}

export interface PexelsPhotoSource {
  original: string;
  large2x: string;
  large: string;
  medium: string;
  small: string;
  portrait: string;
  landscape: string;
  tiny: string;
}

export interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string; // Pexels photo page URL
  photographer: string;
  photographer_url: string;
  photographer_id: number;
  avg_color: string; // Average color (hex)
  src: PexelsPhotoSource;
  liked: boolean;
  alt: string; // Alt text description
}

export interface PexelsPhotoSearchResponse {
  page: number;
  per_page: number;
  total_results: number;
  photos: PexelsPhoto[];
  next_page?: string;
}

export interface PexelsSelectedPhoto {
  photoId: number;
  downloadUrl: string;
  resolution: string; // e.g., "1920x1080"
  photographer: string;
  alt: string;
}

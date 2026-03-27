/**
 * Type definitions for Google Whisk API integration
 *
 * This file provides type safety for reference-guided image generation
 * and future video generation capabilities.
 */

/**
 * Reference image types supported by Whisk API
 */
export type WhiskReferenceType = 'subject' | 'scene' | 'style';

/**
 * Reference images for guiding generation
 */
export interface WhiskReferenceImages {
  /** Main subject/character reference */
  subject?: string;
  /** Scene/location/background reference */
  scene?: string;
  /** Visual style/aesthetic reference */
  style?: string;
}

/**
 * Whisk API image generation request
 */
export interface WhiskImageGenerateRequest {
  /** Text prompt describing desired image */
  prompt: string;

  /** Aspect ratio for output image */
  aspectRatio?:
    | 'IMAGE_ASPECT_RATIO_SQUARE'           // 1:1
    | 'IMAGE_ASPECT_RATIO_LANDSCAPE'         // 16:9
    | 'IMAGE_ASPECT_RATIO_PORTRAIT'          // 9:16
    | 'IMAGE_ASPECT_RATIO_LANDSCAPE_FOUR_THREE'  // 4:3
    | 'IMAGE_ASPECT_RATIO_PORTRAIT_THREE_FOUR';  // 3:4

  /** Reference images for guided generation */
  referenceImages?: WhiskReferenceImages;

  /** Random seed for reproducibility */
  seed?: number;

  /** Number of images to generate (currently 1) */
  numImages?: number;

  /** Image model to use */
  imageModel?: 'IMAGEN_3_5' | 'IMAGEN_4';
}

/**
 * Whisk API video generation request (Phase 2 - Future)
 */
export interface WhiskVideoGenerateRequest extends WhiskImageGenerateRequest {
  /** Video duration in seconds */
  duration?: number;

  /** Frames per second */
  fps?: number;

  /** Motion intensity */
  motionIntensity?: 'low' | 'medium' | 'high';
}

/**
 * Single generated image result
 */
export interface WhiskGeneratedImage {
  /** Image ID from Whisk */
  id: string;

  /** Direct URL to image */
  url?: string;

  /** Base64-encoded image data */
  base64?: string;
}

/**
 * Whisk API generation response
 */
export interface WhiskGenerateResponse {
  /** Array of generated images */
  images: WhiskGeneratedImage[];

  /** Workflow ID for tracking */
  workflowId?: string;

  /** Seed used (for reproducibility) */
  seed?: number;

  /** Status of generation */
  status: 'success' | 'pending' | 'failed';
}

/**
 * Database scene with reference images
 */
export interface SceneWithReferences {
  id: string;
  job_id: string;
  scene_order: number;
  image_prompt: string;
  ticker_headline: string;
  image_url?: string;
  video_url?: string;  // Phase 2 - Future
  media_type?: 'image' | 'video';  // Phase 2 - Future
  generation_status: 'pending' | 'generating' | 'completed' | 'failed';
  reference_images?: WhiskReferenceImages;
  generation_params?: Record<string, any>;
  whisk_request_id?: string;
  error_message?: string;
}

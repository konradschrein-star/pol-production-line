/**
 * Animation Configuration
 *
 * Global configuration for animation profiles and intensity levels.
 * Can be controlled via environment variables.
 */

export type AnimationIntensity = 'subtle' | 'moderate' | 'dramatic' | 'disabled';

export interface AnimationProfile {
  name: AnimationIntensity;
  zoomMultiplier: number; // Scale the zoom range by this factor
  panMultiplier: number; // Scale the pan distance by this factor
  enabled: boolean;
  description: string;
}

/**
 * Animation Profile Definitions
 *
 * Profiles control the overall intensity of all animations in the video.
 * Use environment variable ANIMATION_PROFILE to select.
 */
export const animationProfiles: Record<AnimationIntensity, AnimationProfile> = {
  subtle: {
    name: 'subtle',
    zoomMultiplier: 0.5,
    panMultiplier: 0.5,
    enabled: true,
    description: 'Minimal animation, professional and understated',
  },

  moderate: {
    name: 'moderate',
    zoomMultiplier: 1.0,
    panMultiplier: 1.0,
    enabled: true,
    description: 'Balanced animation, default setting',
  },

  dramatic: {
    name: 'dramatic',
    zoomMultiplier: 1.5,
    panMultiplier: 1.5,
    enabled: true,
    description: 'Strong animation, dynamic and eye-catching',
  },

  disabled: {
    name: 'disabled',
    zoomMultiplier: 0,
    panMultiplier: 0,
    enabled: false,
    description: 'No animation, static images only',
  },
};

/**
 * Get Active Animation Profile
 *
 * Reads from environment variable ANIMATION_PROFILE (default: 'moderate')
 * Falls back to 'moderate' if invalid value provided.
 *
 * @returns Active AnimationProfile
 */
export function getAnimationProfile(): AnimationProfile {
  const profileName = (process.env.ANIMATION_PROFILE || 'moderate') as AnimationIntensity;

  if (animationProfiles[profileName]) {
    return animationProfiles[profileName];
  }

  console.warn(
    `[AnimationConfig] Invalid ANIMATION_PROFILE: ${profileName}. Falling back to 'moderate'.`
  );
  return animationProfiles.moderate;
}

/**
 * Check if Animations Enabled
 *
 * @returns true if animations should be applied
 */
export function isAnimationEnabled(): boolean {
  return getAnimationProfile().enabled;
}

/**
 * Apply Profile Scaling
 *
 * Applies the active profile's multipliers to animation values.
 *
 * @param value - Original animation value
 * @param type - 'zoom' or 'pan'
 * @returns Scaled value
 */
export function scaleAnimationValue(value: number, type: 'zoom' | 'pan'): number {
  const profile = getAnimationProfile();

  if (!profile.enabled) {
    return type === 'zoom' ? 1.0 : 0; // No zoom (1.0) or no pan (0)
  }

  const multiplier = type === 'zoom' ? profile.zoomMultiplier : profile.panMultiplier;
  return value * multiplier;
}

/**
 * Subtitle Animation Configuration
 */
export interface SubtitleAnimationConfig {
  enabled: boolean;
  fadeInDuration: number; // seconds
  fadeOutDuration: number; // seconds
  slideDistance: number; // pixels for slideUp animation
  scaleRange: [number, number]; // [start, end] for scale animation
  blurDistance: number; // pixels for blur animation
}

export const subtitleAnimationConfig: SubtitleAnimationConfig = {
  enabled: true,
  fadeInDuration: 0.2, // 200ms
  fadeOutDuration: 0.2, // 200ms
  slideDistance: 20,
  scaleRange: [0.95, 1.0],
  blurDistance: 4,
};

/**
 * Ticker Animation Configuration
 */
export interface TickerAnimationConfig {
  baseSpeed: number; // pixels per frame
  longHeadlineThreshold: number; // character count
  longHeadlineSpeed: number; // pixels per frame for long headlines
  pauseEnabled: boolean;
  pauseDuration: number; // frames
}

export const tickerAnimationConfig: TickerAnimationConfig = {
  baseSpeed: 3,
  longHeadlineThreshold: 60,
  longHeadlineSpeed: 2,
  pauseEnabled: false, // Disabled by default for seamless scroll
  pauseDuration: 90, // 3 seconds at 30fps
};

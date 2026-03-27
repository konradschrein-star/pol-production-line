/**
 * Subtitle Animation Styles
 *
 * Provides 4 distinct animation styles for subtitles.
 * Style selection is deterministic based on subtitle text hash.
 */

import { interpolate } from 'remotion';
import { subtitleAnimationConfig } from './config';

export type SubtitleAnimationStyle = 'fade' | 'slideUp' | 'scale' | 'blur';

export interface SubtitleStyleResult {
  opacity: number;
  transform: string;
  filter?: string;
}

/**
 * Hash Subtitle Text
 *
 * Simple hash function to deterministically select animation style.
 * Same text will always get same style.
 *
 * @param text - Subtitle text
 * @returns Hash number (0-3 for 4 styles)
 */
export function hashSubtitleText(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash) % 4; // Return 0-3 for 4 styles
}

/**
 * Select Animation Style
 *
 * @param text - Subtitle text
 * @returns Animation style name
 */
export function selectAnimationStyle(text: string): SubtitleAnimationStyle {
  const styles: SubtitleAnimationStyle[] = ['fade', 'slideUp', 'scale', 'blur'];
  const hash = hashSubtitleText(text);
  return styles[hash];
}

/**
 * Apply Fade Animation
 *
 * Simple opacity fade in/out
 */
function applyFadeStyle(opacity: number): SubtitleStyleResult {
  return {
    opacity,
    transform: 'none',
  };
}

/**
 * Apply Slide Up Animation
 *
 * Fade in with upward slide
 */
function applySlideUpStyle(opacity: number): SubtitleStyleResult {
  const slideDistance = subtitleAnimationConfig.slideDistance;
  const translateY = (1 - opacity) * slideDistance;

  return {
    opacity,
    transform: `translateY(${translateY}px)`,
  };
}

/**
 * Apply Scale Animation
 *
 * Fade in with scale from 95% to 100%
 */
function applyScaleStyle(opacity: number): SubtitleStyleResult {
  const [scaleStart, scaleEnd] = subtitleAnimationConfig.scaleRange;
  const scale = interpolate(
    opacity,
    [0, 1],
    [scaleStart, scaleEnd],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return {
    opacity,
    transform: `scale(${scale})`,
  };
}

/**
 * Apply Blur Animation
 *
 * Fade in with blur effect (blur to clear)
 */
function applyBlurStyle(opacity: number): SubtitleStyleResult {
  const blurDistance = subtitleAnimationConfig.blurDistance;
  const blur = (1 - opacity) * blurDistance;

  return {
    opacity,
    transform: 'none',
    filter: `blur(${blur}px)`,
  };
}

/**
 * Calculate Subtitle Style
 *
 * Main function to calculate subtitle styles based on selected animation type.
 *
 * @param text - Subtitle text (for style selection)
 * @param opacity - Current opacity (0-1)
 * @returns Style object with opacity, transform, and optional filter
 */
export function calculateSubtitleStyle(
  text: string,
  opacity: number
): SubtitleStyleResult {
  if (!subtitleAnimationConfig.enabled) {
    return applyFadeStyle(opacity);
  }

  const style = selectAnimationStyle(text);

  switch (style) {
    case 'fade':
      return applyFadeStyle(opacity);
    case 'slideUp':
      return applySlideUpStyle(opacity);
    case 'scale':
      return applyScaleStyle(opacity);
    case 'blur':
      return applyBlurStyle(opacity);
    default:
      return applyFadeStyle(opacity);
  }
}

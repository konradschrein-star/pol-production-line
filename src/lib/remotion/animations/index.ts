/**
 * Remotion Animations Module
 *
 * Central export for all animation utilities, patterns, and configurations.
 */

export {
  type AnimationPattern,
  type EasingFunction,
  animationPatterns,
  easingFunctions,
  selectPatternForScene,
  getPatternByName,
  listPatternNames,
} from './patterns';

export {
  type AnimationIntensity,
  type AnimationProfile,
  type SubtitleAnimationConfig,
  type TickerAnimationConfig,
  animationProfiles,
  getAnimationProfile,
  isAnimationEnabled,
  scaleAnimationValue,
  subtitleAnimationConfig,
  tickerAnimationConfig,
} from './config';

export {
  type SubtitleAnimationStyle,
  type SubtitleStyleResult,
  hashSubtitleText,
  selectAnimationStyle,
  calculateSubtitleStyle,
} from './subtitle-styles';

/**
 * Animation Patterns Library
 *
 * Provides dynamic Ken Burns animation variety for video scenes.
 * Each pattern defines zoom range, pan direction, and easing function.
 */

export type EasingFunction = (t: number) => number;

export interface AnimationPattern {
  name: string;
  zoomRange: [number, number]; // [start, end] scale values (e.g., [1.0, 1.15])
  panDirection: {
    x: [number, number]; // [start, end] horizontal pan in pixels
    y: [number, number]; // [start, end] vertical pan in pixels
  };
  easing: keyof typeof easingFunctions;
  description: string;
}

/**
 * Easing Functions
 * Pure functions for animation timing curves
 */
export const easingFunctions: Record<string, EasingFunction> = {
  linear: (t: number) => t,

  easeInOutQuad: (t: number) => {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  },

  easeOutCubic: (t: number) => {
    return 1 - Math.pow(1 - t, 3);
  },

  easeInCubic: (t: number) => {
    return t * t * t;
  },

  easeInOutCubic: (t: number) => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  },

  easeOutQuad: (t: number) => {
    return 1 - (1 - t) * (1 - t);
  },
};

/**
 * Animation Pattern Definitions
 *
 * 6 distinct patterns for visual variety:
 * 1. zoom-in-left - Dramatic zoom with left pan
 * 2. zoom-out-right - Reverse zoom with right pan
 * 3. diagonal-drift - Moderate zoom with diagonal movement
 * 4. subtle-center - Minimal zoom, centered
 * 5. dramatic-zoom - Strong zoom with dynamic pan
 * 6. static-slight - Very subtle movement
 */
export const animationPatterns: Record<string, AnimationPattern> = {
  'zoom-in-left': {
    name: 'zoom-in-left',
    zoomRange: [1.0, 1.15],
    panDirection: {
      x: [0, -40], // Pan left
      y: [0, -20], // Slight upward
    },
    easing: 'easeOutCubic',
    description: 'Dramatic zoom in with leftward pan',
  },

  'zoom-out-right': {
    name: 'zoom-out-right',
    zoomRange: [1.15, 1.05], // Changed: Never go below 1.0 to avoid black bars
    panDirection: {
      x: [0, 40], // Pan right
      y: [0, -15], // Slight upward
    },
    easing: 'easeInCubic',
    description: 'Slight zoom reduction with rightward pan (stays above 100%)',
  },

  'diagonal-drift': {
    name: 'diagonal-drift',
    zoomRange: [1.05, 1.12],
    panDirection: {
      x: [0, 35], // Diagonal right
      y: [0, -25], // Diagonal up
    },
    easing: 'easeInOutQuad',
    description: 'Moderate zoom with diagonal movement',
  },

  'subtle-center': {
    name: 'subtle-center',
    zoomRange: [1.0, 1.05],
    panDirection: {
      x: [0, 0], // No horizontal pan
      y: [0, -10], // Minimal vertical
    },
    easing: 'easeOutQuad',
    description: 'Minimal zoom, mostly centered',
  },

  'dramatic-zoom': {
    name: 'dramatic-zoom',
    zoomRange: [1.0, 1.25],
    panDirection: {
      x: [0, 50], // Strong pan
      y: [0, -30], // Strong upward
    },
    easing: 'easeInOutCubic',
    description: 'Strong zoom with dynamic pan',
  },

  'static-slight': {
    name: 'static-slight',
    zoomRange: [1.0, 1.02],
    panDirection: {
      x: [0, 5], // Very subtle
      y: [0, -5], // Very subtle
    },
    easing: 'linear',
    description: 'Very subtle movement, almost static',
  },

  'simple-growth': {
    name: 'simple-growth',
    zoomRange: [1.0, 1.1],
    panDirection: {
      x: [0, 0], // No pan
      y: [0, 0], // No pan
    },
    easing: 'linear',
    description: 'Simple linear growth, no panning - smooth and non-disturbing',
  },
};

/**
 * Select Animation Pattern for Scene
 *
 * Intelligently selects patterns based on scene position:
 * - Hook scenes (0-2): Use dramatic patterns to grab attention
 * - Body scenes (3-6): Vary between all patterns for diversity
 * - Final scene (7+): Use zoom-out or static for closure
 *
 * @param sceneIndex - Zero-based scene index
 * @param totalScenes - Total number of scenes in video
 * @returns AnimationPattern object
 */
export function selectPatternForScene(
  sceneIndex: number,
  totalScenes: number
): AnimationPattern {
  // USE SIMPLE-GROWTH FOR ALL SCENES
  // Simple linear growth (1.0 → 1.1) with no panning
  // Smooth, non-disturbing, professional
  return animationPatterns['simple-growth'];

  // OLD COMPLEX PATTERNS (DISABLED - kept for reference):
  // Final scene: Zoom out or static (check this first to handle single-scene videos)
  // if (sceneIndex === totalScenes - 1 && totalScenes > 3) {
  //   const closingPatterns = ['zoom-out-right', 'static-slight'];
  //   const patternName = closingPatterns[sceneIndex % closingPatterns.length];
  //   return animationPatterns[patternName];
  // }

  // Hook scenes (first 3): Dramatic patterns
  // if (sceneIndex < 3) {
  //   const hookPatterns = [
  //     'dramatic-zoom',
  //     'zoom-in-left',
  //     'diagonal-drift',
  //   ];
  //   const patternName = hookPatterns[sceneIndex % hookPatterns.length];
  //   return animationPatterns[patternName];
  // }

  // Body scenes: Rotate through all patterns for variety
  // const allPatternNames = Object.keys(animationPatterns);
  // const patternName = allPatternNames[sceneIndex % allPatternNames.length];
  // return animationPatterns[patternName];
}

/**
 * Get Pattern by Name
 *
 * @param name - Pattern name
 * @returns AnimationPattern or default pattern if not found
 */
export function getPatternByName(name: string): AnimationPattern {
  return animationPatterns[name] || animationPatterns['subtle-center'];
}

/**
 * List All Available Patterns
 *
 * @returns Array of pattern names
 */
export function listPatternNames(): string[] {
  return Object.keys(animationPatterns);
}

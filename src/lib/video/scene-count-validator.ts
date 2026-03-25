/**
 * Scene Count Validation
 *
 * Validates that the number of scenes is reasonable for video duration
 */

export interface SceneCountValidation {
  valid: boolean;
  sceneCount: number;
  videoDuration: number;
  recommendedRange: { min: number; max: number };
  warnings: string[];
  adjustmentSuggestion?: string;
}

/**
 * Validate scene count is reasonable for video duration
 *
 * Rules:
 * - First 30 seconds: Rapid transitions (1.5s per scene)
 * - After 30 seconds: Slower transitions (5-10s per scene)
 * - Too few scenes: Video feels static
 * - Too many scenes: Overwhelming/jarring
 */
export function validateSceneCount(
  videoDurationSeconds: number,
  sceneCount: number
): SceneCountValidation {
  const result: SceneCountValidation = {
    valid: true,
    sceneCount,
    videoDuration: videoDurationSeconds,
    recommendedRange: { min: 0, max: 0 },
    warnings: [],
  };

  // Calculate recommended range
  const { min, max } = calculateRecommendedSceneCount(videoDurationSeconds);
  result.recommendedRange = { min, max };

  // Validate
  if (sceneCount < min) {
    result.valid = false;
    result.warnings.push(
      `Too few scenes (${sceneCount}) for ${videoDurationSeconds}s video. ` +
      `Recommended: ${min}-${max} scenes. ` +
      `With ${sceneCount} scenes, each will last ~${(videoDurationSeconds / sceneCount).toFixed(1)}s, which may feel too static.`
    );
    result.adjustmentSuggestion = `Increase to ${min} scenes for better pacing`;
  } else if (sceneCount > max) {
    result.valid = false;
    result.warnings.push(
      `Too many scenes (${sceneCount}) for ${videoDurationSeconds}s video. ` +
      `Recommended: ${min}-${max} scenes. ` +
      `With ${sceneCount} scenes, each will last ~${(videoDurationSeconds / sceneCount).toFixed(1)}s, which may feel too fast/jarring.`
    );
    result.adjustmentSuggestion = `Reduce to ${max} scenes for better pacing`;
  } else {
    // Within range - check for optimal
    const optimal = calculateOptimalSceneCount(videoDurationSeconds);
    if (Math.abs(sceneCount - optimal) > 3) {
      result.warnings.push(
        `Scene count (${sceneCount}) is acceptable but not optimal. ` +
        `Optimal: ~${optimal} scenes for ${videoDurationSeconds}s video.`
      );
    }
  }

  return result;
}

/**
 * Calculate recommended scene count range
 */
function calculateRecommendedSceneCount(videoDurationSeconds: number): {
  min: number;
  max: number;
} {
  // Hook phase: 30 seconds with 1.5s transitions = 20 scenes max
  const HOOK_DURATION = Math.min(30, videoDurationSeconds);
  const HOOK_INTERVAL = 1.5;

  // Body phase: Remaining time with 5-10s per scene
  const bodyDuration = Math.max(0, videoDurationSeconds - HOOK_DURATION);
  const BODY_MIN_INTERVAL = 5;
  const BODY_MAX_INTERVAL = 10;

  // Calculate ranges
  const hookScenesMin = Math.floor(HOOK_DURATION / 3); // At least 1 scene per 3 seconds
  const hookScenesMax = Math.floor(HOOK_DURATION / HOOK_INTERVAL);

  const bodyScenesMin = bodyDuration > 0 ? Math.floor(bodyDuration / BODY_MAX_INTERVAL) : 0;
  const bodyScenesMax = bodyDuration > 0 ? Math.ceil(bodyDuration / BODY_MIN_INTERVAL) : 0;

  const min = hookScenesMin + bodyScenesMin;
  const max = hookScenesMax + bodyScenesMax;

  return {
    min: Math.max(4, min), // At least 4 scenes minimum
    max: max, // No arbitrary cap - duration-based calculation determines max
  };
}

/**
 * Calculate optimal scene count (sweet spot)
 */
function calculateOptimalSceneCount(videoDurationSeconds: number): number {
  const HOOK_DURATION = Math.min(30, videoDurationSeconds);
  const bodyDuration = Math.max(0, videoDurationSeconds - HOOK_DURATION);

  // Hook: 1 scene every 2 seconds (middle ground between 1.5s and 3s)
  const hookScenes = Math.round(HOOK_DURATION / 2);

  // Body: 1 scene every 7 seconds (middle of 5-10s range)
  const bodyScenes = bodyDuration > 0 ? Math.round(bodyDuration / 7) : 0;

  return hookScenes + bodyScenes;
}

/**
 * Format validation result for logging
 */
export function formatSceneCountValidation(result: SceneCountValidation): string {
  const lines = [
    `\n📊 [Scene Count] Validation for ${result.videoDuration}s video:`,
    `   Scenes: ${result.sceneCount}`,
    `   Recommended range: ${result.recommendedRange.min}-${result.recommendedRange.max}`,
    `   Status: ${result.valid ? '✅ VALID' : '⚠️  NEEDS ADJUSTMENT'}`,
  ];

  if (result.warnings.length > 0) {
    lines.push(`   Warnings:`);
    result.warnings.forEach(warning => {
      lines.push(`     - ${warning}`);
    });
  }

  if (result.adjustmentSuggestion) {
    lines.push(`   💡 Suggestion: ${result.adjustmentSuggestion}`);
  }

  return lines.join('\n');
}

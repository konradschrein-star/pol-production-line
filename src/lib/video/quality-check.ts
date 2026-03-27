/**
 * Quality Check System for Video Rendering
 *
 * Validates:
 * - Scene count matches expectations
 * - All scenes have images assigned
 * - Scene timing covers full video duration (no gaps/black screens)
 * - Scene durations are reasonable
 */

export interface QualityCheckResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  details: {
    sceneCount: number;
    expectedSceneCount: number;
    totalDuration: number;
    coverage: {
      startFrame: number;
      endFrame: number;
      expectedEndFrame: number;
      hasGaps: boolean;
      gapFrames?: number;
    };
    sceneDetails: Array<{
      index: number;
      id: string;
      startFrame: number;
      endFrame: number;
      durationFrames: number;
      durationSeconds: number;
      hasImage: boolean;
      imageUrl?: string;
    }>;
  };
}

interface Scene {
  id: string;
  image_url: string;
  ticker_headline: string;
  scene_order: number;
}

interface SceneTiming {
  sceneId: string;
  startFrame: number;
  durationInFrames: number;
  durationInSeconds: number;
}

/**
 * Validate scene data before rendering
 */
export function validateSceneQuality(
  scenes: Scene[],
  sceneTiming: SceneTiming[],
  totalDurationInFrames: number,
  fps: number = 30
): QualityCheckResult {
  console.log(`\n🔍 [QUALITY] Running pre-render quality checks...`);

  const result: QualityCheckResult = {
    passed: true,
    errors: [],
    warnings: [],
    details: {
      sceneCount: scenes.length,
      expectedSceneCount: sceneTiming.length,
      totalDuration: totalDurationInFrames / fps,
      coverage: {
        startFrame: 0,
        endFrame: 0,
        expectedEndFrame: totalDurationInFrames,
        hasGaps: false,
      },
      sceneDetails: [],
    },
  };

  // 1. Check scene count matches
  if (scenes.length !== sceneTiming.length) {
    result.passed = false;
    result.errors.push(
      `Scene count mismatch: ${scenes.length} scenes vs ${sceneTiming.length} timing entries`
    );
  }

  // 2. Check all scenes have images
  const missingImages = scenes.filter((s) => !s.image_url || s.image_url.trim() === '');
  if (missingImages.length > 0) {
    result.passed = false;
    result.errors.push(
      `${missingImages.length} scenes missing image_url: ${missingImages
        .map((s) => s.id)
        .join(', ')}`
    );
  }

  // 3. Build scene details and check timing coverage
  let lastEndFrame = 0;
  let hasGaps = false;
  let totalGapFrames = 0;

  for (let i = 0; i < sceneTiming.length; i++) {
    const timing = sceneTiming[i];
    const scene = scenes[i];

    const startFrame = timing.startFrame;
    const endFrame = timing.startFrame + timing.durationInFrames;

    // Check for gap between scenes
    if (startFrame > lastEndFrame && lastEndFrame > 0) {
      const gapFrames = startFrame - lastEndFrame;
      const gapSeconds = gapFrames / fps;

      hasGaps = true;
      totalGapFrames += gapFrames;

      result.warnings.push(
        `Gap detected between scene ${i} and ${i + 1}: ${gapFrames} frames (${gapSeconds.toFixed(
          2
        )}s) - THIS WILL CAUSE BLACK SCREENS`
      );
    }

    // Check for negative duration
    if (timing.durationInFrames <= 0) {
      result.passed = false;
      result.errors.push(`Scene ${i} has invalid duration: ${timing.durationInFrames} frames`);
    }

    // Check for very short duration (< 0.5s)
    if (timing.durationInSeconds < 0.5) {
      result.warnings.push(
        `Scene ${i} is very short (${timing.durationInSeconds.toFixed(
          2
        )}s) - may flash too quickly`
      );
    }

    // Check for very long duration (> 15s in body)
    if (timing.durationInSeconds > 15 && i > 3) {
      result.warnings.push(
        `Scene ${i} is very long (${timing.durationInSeconds.toFixed(2)}s) - may feel static`
      );
    }

    result.details.sceneDetails.push({
      index: i,
      id: scene?.id || timing.sceneId,
      startFrame,
      endFrame,
      durationFrames: timing.durationInFrames,
      durationSeconds: timing.durationInSeconds,
      hasImage: scene ? !!scene.image_url : false,
      imageUrl: scene?.image_url,
    });

    lastEndFrame = endFrame;
  }

  // 4. Check coverage reaches end of video
  result.details.coverage.endFrame = lastEndFrame;
  result.details.coverage.hasGaps = hasGaps;
  result.details.coverage.gapFrames = totalGapFrames;

  const frameDifference = totalDurationInFrames - lastEndFrame;

  if (Math.abs(frameDifference) > 1) {
    // Allow 1 frame tolerance for rounding
    if (frameDifference > 0) {
      result.passed = false;
      result.errors.push(
        `Scenes don't cover full video: End at frame ${lastEndFrame}, expected ${totalDurationInFrames} (${frameDifference} frames missing = ${(
          frameDifference / fps
        ).toFixed(2)}s of BLACK SCREEN at end)`
      );
    } else {
      result.warnings.push(
        `Scenes exceed video duration by ${Math.abs(frameDifference)} frames (will be truncated)`
      );
    }
  }

  if (hasGaps) {
    result.passed = false;
    result.errors.push(
      `Total gap frames: ${totalGapFrames} (${(totalGapFrames / fps).toFixed(
        2
      )}s of BLACK SCREENS)`
    );
  }

  // 5. Summary logging
  console.log(`\n📊 [QUALITY] Check Summary:`);
  console.log(`   Scenes: ${scenes.length} / ${sceneTiming.length} (${scenes.length === sceneTiming.length ? '✅' : '❌'})`);
  console.log(`   Images: ${scenes.length - missingImages.length} / ${scenes.length} (${missingImages.length === 0 ? '✅' : '❌'})`);
  console.log(`   Coverage: 0 → ${lastEndFrame} / ${totalDurationInFrames} frames (${Math.abs(frameDifference) <= 1 ? '✅' : '❌'})`);
  console.log(`   Gaps: ${hasGaps ? `❌ ${totalGapFrames} frames (${(totalGapFrames / fps).toFixed(2)}s)` : '✅ None'}`);

  if (result.errors.length > 0) {
    console.log(`\n❌ [QUALITY] FAILED - ${result.errors.length} errors:`);
    result.errors.forEach((err) => console.log(`   - ${err}`));
  }

  if (result.warnings.length > 0) {
    console.log(`\n⚠️  [QUALITY] ${result.warnings.length} warnings:`);
    result.warnings.forEach((warn) => console.log(`   - ${warn}`));
  }

  if (result.passed && result.warnings.length === 0) {
    console.log(`\n✅ [QUALITY] All checks passed!`);
  }

  return result;
}

/**
 * Validate prompt quality (manual review helper)
 */
export function validatePromptQuality(prompts: string[]): {
  passed: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  prompts.forEach((prompt, i) => {
    // Check for empty prompts
    if (!prompt || prompt.trim().length === 0) {
      issues.push(`Scene ${i + 1}: Empty prompt`);
    }

    // Check for very short prompts (likely not descriptive enough)
    if (prompt.trim().split(' ').length < 5) {
      issues.push(`Scene ${i + 1}: Prompt too short (${prompt.trim().split(' ').length} words)`);
    }

    // Check for very long prompts (may confuse image generator)
    if (prompt.length > 500) {
      issues.push(`Scene ${i + 1}: Prompt too long (${prompt.length} chars)`);
    }

    // Check for generic/placeholder text
    const genericTerms = ['placeholder', 'todo', 'tbd', 'test', 'example'];
    const lowerPrompt = prompt.toLowerCase();
    for (const term of genericTerms) {
      if (lowerPrompt.includes(term)) {
        issues.push(`Scene ${i + 1}: Contains placeholder text: "${term}"`);
      }
    }
  });

  return {
    passed: issues.length === 0,
    issues,
  };
}

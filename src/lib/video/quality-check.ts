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

  // 1.5. Check scene order is sequential (0, 1, 2, 3...)
  const expectedOrder = Array.from({ length: scenes.length }, (_, i) => i);
  const actualOrder = scenes.map((s) => s.scene_order).sort((a, b) => a - b);

  const orderMismatch = expectedOrder.some((exp, idx) => exp !== actualOrder[idx]);
  if (orderMismatch) {
    result.passed = false;
    result.errors.push(
      `Scene order not sequential: expected [${expectedOrder.join(', ')}], ` +
        `got [${actualOrder.join(', ')}]`
    );
  }

  // 1.6. ✅ FIX (Bug #3): Validate scene IDs match timing IDs
  // This ensures scenes[i] correctly matches sceneTiming[i]
  for (let i = 0; i < Math.min(scenes.length, sceneTiming.length); i++) {
    const scene = scenes[i];
    const timing = sceneTiming[i];

    // Extract scene number from ID (handle both "scene_0" and UUID formats)
    const sceneIdMatch = scene.id.match(/scene_(\d+)/);

    if (sceneIdMatch) {
      const sceneNumber = parseInt(sceneIdMatch[1]);

      // Scene ID should match its position in the array
      if (sceneNumber !== i) {
        result.passed = false;
        result.errors.push(
          `Scene ${i} has mismatched ID: expected "scene_${i}", got "${scene.id}"`
        );
      }

      // Timing ID should also match
      if (timing.sceneId !== `scene_${i}`) {
        result.passed = false;
        result.errors.push(
          `Scene ${i} timing mismatch: scene ID is "${scene.id}", but timing ID is "${timing.sceneId}"`
        );
      }
    } else {
      // UUID format is OK for database-generated IDs, but warn for transparency
      if (i === 0) {
        // Only warn once to avoid spam
        result.warnings.push(
          `Scene IDs are in UUID format (not "scene_N" format). This is OK for database-generated IDs.`
        );
      }
    }
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
  let totalSceneDuration = 0;

  for (let i = 0; i < sceneTiming.length; i++) {
    const timing = sceneTiming[i];
    const scene = scenes[i];

    const startFrame = timing.startFrame;
    const endFrame = timing.startFrame + timing.durationInFrames;

    // Track cumulative duration
    totalSceneDuration += timing.durationInSeconds;

    // CRITICAL FIX (Bug #23): Check first scene starts at frame 0
    if (i === 0 && startFrame !== 0) {
      const gapFrames = startFrame;
      const gapSeconds = gapFrames / fps;

      hasGaps = true;
      totalGapFrames += gapFrames;

      result.warnings.push(
        `Gap at start: First scene starts at frame ${startFrame} instead of 0 (${gapSeconds.toFixed(
          2
        )}s gap) - THIS WILL CAUSE BLACK SCREEN`
      );
    }

    // Check for gap between scenes
    if (i > 0 && startFrame > lastEndFrame) {
      const gapFrames = startFrame - lastEndFrame;
      const gapSeconds = gapFrames / fps;

      hasGaps = true;
      totalGapFrames += gapFrames;

      result.warnings.push(
        `Gap detected between scene ${i - 1} and ${i}: ${gapFrames} frames (${gapSeconds.toFixed(
          2
        )}s) - THIS WILL CAUSE BLACK SCREENS`
      );
    }

    // Check for overlap with next scene
    if (i < sceneTiming.length - 1) {
      const nextStart = sceneTiming[i + 1].startFrame;
      if (endFrame > nextStart) {
        result.passed = false;
        result.errors.push(
          `Scene ${i} overlaps with scene ${i + 1}: ` +
            `ends at frame ${endFrame}, next starts at ${nextStart}`
        );
      }
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

  // 4.5. Verify total scene duration matches video duration
  const expectedDuration = totalDurationInFrames / fps;
  const durationDiff = Math.abs(totalSceneDuration - expectedDuration);

  if (durationDiff > 0.1) {
    // Allow 0.1s tolerance for rounding
    result.passed = false;
    result.errors.push(
      `Scene duration sum (${totalSceneDuration.toFixed(2)}s) doesn't match ` +
        `video duration (${expectedDuration.toFixed(2)}s) - diff: ${durationDiff.toFixed(2)}s`
    );
  }

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
  console.log(`   Scene order: ${orderMismatch ? '❌ Non-sequential' : '✅ Sequential'}`);
  console.log(`   Images: ${scenes.length - missingImages.length} / ${scenes.length} (${missingImages.length === 0 ? '✅' : '❌'})`);
  console.log(`   Coverage: 0 → ${lastEndFrame} / ${totalDurationInFrames} frames (${Math.abs(frameDifference) <= 1 ? '✅' : '❌'})`);
  console.log(`   Duration sum: ${durationDiff <= 0.1 ? '✅' : '❌'} ${totalSceneDuration.toFixed(2)}s / ${expectedDuration.toFixed(2)}s`);
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

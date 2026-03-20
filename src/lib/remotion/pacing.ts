/**
 * Pacing Algorithm for Video Composition
 *
 * Critical Logic:
 * - Hook (0-15s): Rapid 1.5s image transitions (rigid timing)
 * - Body (15s+): 1 image per sentence (dynamic, based on remaining duration)
 */

export interface SceneTiming {
  sceneId: string;
  startFrame: number;
  durationInFrames: number;
  durationInSeconds: number;
}

export interface PacingResult {
  totalDurationInFrames: number;
  totalDurationInSeconds: number;
  sceneTiming: SceneTiming[];
  hookScenes: number;
  bodyScenes: number;
}

/**
 * Calculate scene durations based on avatar audio length
 *
 * @param avatarDurationSeconds - Total duration of avatar video in seconds
 * @param sceneCount - Total number of scenes/images
 * @param fps - Frames per second (default: 30)
 * @returns Scene timing information
 */
export function calculateScenePacing(
  avatarDurationSeconds: number,
  sceneCount: number,
  fps: number = 30
): PacingResult {
  const HOOK_DURATION_SECONDS = 15;
  const HOOK_INTERVAL_SECONDS = 1.5;

  console.log(`\n📐 [Pacing] Calculating scene timing...`);
  console.log(`   Avatar duration: ${avatarDurationSeconds}s`);
  console.log(`   Scene count: ${sceneCount}`);
  console.log(`   FPS: ${fps}`);

  // Edge case: Video shorter than hook duration
  if (avatarDurationSeconds <= HOOK_DURATION_SECONDS) {
    console.log(`⚠️  [Pacing] Video shorter than hook duration (${HOOK_DURATION_SECONDS}s)`);
    console.log(`   Using uniform ${HOOK_INTERVAL_SECONDS}s intervals for all scenes`);

    const sceneTiming: SceneTiming[] = [];
    let currentFrame = 0;

    for (let i = 0; i < sceneCount; i++) {
      const durationInFrames = Math.round(HOOK_INTERVAL_SECONDS * fps);

      sceneTiming.push({
        sceneId: `scene_${i}`,
        startFrame: currentFrame,
        durationInFrames,
        durationInSeconds: HOOK_INTERVAL_SECONDS,
      });

      currentFrame += durationInFrames;
    }

    return {
      totalDurationInFrames: currentFrame,
      totalDurationInSeconds: avatarDurationSeconds,
      sceneTiming,
      hookScenes: sceneCount,
      bodyScenes: 0,
    };
  }

  // Standard case: Hook + Body
  const hookSceneCount = Math.floor(HOOK_DURATION_SECONDS / HOOK_INTERVAL_SECONDS);
  const bodySceneCount = sceneCount - hookSceneCount;

  console.log(`   Hook scenes (0-${HOOK_DURATION_SECONDS}s): ${hookSceneCount} @ ${HOOK_INTERVAL_SECONDS}s each`);
  console.log(`   Body scenes (${HOOK_DURATION_SECONDS}s+): ${bodySceneCount}`);

  // All scenes are hook scenes
  if (bodySceneCount <= 0) {
    console.log(`   All scenes fit in hook period`);

    const sceneTiming: SceneTiming[] = [];
    let currentFrame = 0;

    for (let i = 0; i < sceneCount; i++) {
      const durationInFrames = Math.round(HOOK_INTERVAL_SECONDS * fps);

      sceneTiming.push({
        sceneId: `scene_${i}`,
        startFrame: currentFrame,
        durationInFrames,
        durationInSeconds: HOOK_INTERVAL_SECONDS,
      });

      currentFrame += durationInFrames;
    }

    return {
      totalDurationInFrames: Math.round(avatarDurationSeconds * fps),
      totalDurationInSeconds: avatarDurationSeconds,
      sceneTiming,
      hookScenes: sceneCount,
      bodyScenes: 0,
    };
  }

  // Calculate body scene duration
  const remainingTime = avatarDurationSeconds - HOOK_DURATION_SECONDS;
  const bodyIntervalSeconds = remainingTime / bodySceneCount;

  console.log(`   Body interval: ${bodyIntervalSeconds.toFixed(2)}s per scene`);

  // Build scene timing array
  const sceneTiming: SceneTiming[] = [];
  let currentFrame = 0;

  // Hook scenes
  for (let i = 0; i < hookSceneCount; i++) {
    const durationInFrames = Math.round(HOOK_INTERVAL_SECONDS * fps);

    sceneTiming.push({
      sceneId: `scene_${i}`,
      startFrame: currentFrame,
      durationInFrames,
      durationInSeconds: HOOK_INTERVAL_SECONDS,
    });

    currentFrame += durationInFrames;
  }

  // Body scenes
  for (let i = hookSceneCount; i < sceneCount; i++) {
    const durationInFrames = Math.round(bodyIntervalSeconds * fps);

    sceneTiming.push({
      sceneId: `scene_${i}`,
      startFrame: currentFrame,
      durationInFrames,
      durationInSeconds: bodyIntervalSeconds,
    });

    currentFrame += durationInFrames;
  }

  // Final frame count should match avatar duration
  const totalFrames = Math.round(avatarDurationSeconds * fps);

  console.log(`✅ [Pacing] Calculated ${sceneCount} scenes`);
  console.log(`   Total duration: ${avatarDurationSeconds}s (${totalFrames} frames)`);

  return {
    totalDurationInFrames: totalFrames,
    totalDurationInSeconds: avatarDurationSeconds,
    sceneTiming,
    hookScenes: hookSceneCount,
    bodyScenes: bodySceneCount,
  };
}

/**
 * Get audio duration from MP4 file
 * Uses Remotion's getVideoMetadata utility
 *
 * @param videoUrl - URL or path to video file
 * @returns Duration in seconds
 */
export async function getVideoDuration(videoUrl: string): Promise<number> {
  try {
    // Dynamic import to avoid bundling issues
    const { getVideoMetadata } = await import('@remotion/media-utils');

    const metadata = await getVideoMetadata(videoUrl);

    console.log(`🎥 [Pacing] Video metadata:`);
    console.log(`   Duration: ${metadata.durationInSeconds}s`);
    console.log(`   Dimensions: ${metadata.width}x${metadata.height}`);

    return metadata.durationInSeconds;
  } catch (error) {
    console.error(`❌ [Pacing] Failed to get video duration:`, error);
    throw new Error(`Failed to get video duration: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Example usage and test cases
 */
export function testPacing() {
  console.log('\n🧪 Testing Pacing Algorithm\n');
  console.log('=' .repeat(60));

  // Test 1: Standard case (60s video, 12 scenes)
  console.log('\nTest 1: 60s avatar, 12 scenes');
  const result1 = calculateScenePacing(60, 12, 30);
  console.log(`   Hook: ${result1.hookScenes} scenes @ 1.5s = ${result1.hookScenes * 1.5}s`);
  console.log(`   Body: ${result1.bodyScenes} scenes @ ${((60 - 15) / result1.bodyScenes).toFixed(2)}s`);

  // Test 2: Short video (10s video, 8 scenes)
  console.log('\nTest 2: 10s avatar, 8 scenes');
  const result2 = calculateScenePacing(10, 8, 30);
  console.log(`   All uniform: ${result2.hookScenes} scenes @ 1.5s`);

  // Test 3: Long video (120s video, 20 scenes)
  console.log('\nTest 3: 120s avatar, 20 scenes');
  const result3 = calculateScenePacing(120, 20, 30);
  console.log(`   Hook: ${result3.hookScenes} scenes @ 1.5s = ${result3.hookScenes * 1.5}s`);
  console.log(`   Body: ${result3.bodyScenes} scenes @ ${((120 - 15) / result3.bodyScenes).toFixed(2)}s`);

  console.log('\n' + '='.repeat(60));
  console.log('✅ Pacing tests complete\n');
}

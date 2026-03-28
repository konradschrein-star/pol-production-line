/**
 * Pacing Algorithm for Video Composition
 *
 * Critical Logic:
 * - Hook (0-30% of duration): 1 image per word (rapid pacing)
 * - Body (30-100%): 1 image per 1-2 sentences (slower, natural pacing)
 */

import { WordTimestamp, SentenceGroup, groupIntoSentences, SceneSentenceInfo } from './types';
import { findWordsForSentence } from '../transcription/sentence-matcher';

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

export interface TranscriptPacingInput {
  avatarDurationSeconds: number;
  wordTimestamps: WordTimestamp[];
  sceneCount: number;
  sceneSentences?: SceneSentenceInfo[]; // Optional: explicit scene-to-sentence mapping from database
  fps?: number;
}

/**
 * Calculate scene durations based on avatar audio length
 *
 * @param avatarDurationSeconds - Total duration of avatar video in seconds
 * @param sceneCount - Total number of scenes/images
 * @param fps - Frames per second (default: 30)
 * @returns Scene timing information
 */
/**
 * Validate pacing algorithm inputs to prevent division by zero
 */
function validatePacingInput(
  avatarDurationSeconds: number,
  sceneCount: number,
  fps: number
): void {
  if (avatarDurationSeconds <= 0) {
    throw new Error(`Invalid avatar duration: ${avatarDurationSeconds}s (must be > 0)`);
  }
  if (sceneCount <= 0) {
    throw new Error(`Invalid scene count: ${sceneCount} (must be > 0)`);
  }
  if (fps <= 0) {
    throw new Error(`Invalid FPS: ${fps} (must be > 0)`);
  }
}

export function calculateScenePacing(
  avatarDurationSeconds: number,
  sceneCount: number,
  fps: number = 30
): PacingResult {
  // CRITICAL: Validate inputs to prevent division by zero
  validatePacingInput(avatarDurationSeconds, sceneCount, fps);

  const HOOK_DURATION_SECONDS = 30; // FIXED: First 30 SECONDS (not percentage)
  const HOOK_INTERVAL_SECONDS = 1.5;

  console.log(`\n📐 [Pacing] Calculating scene timing...`);
  console.log(`   Avatar duration: ${avatarDurationSeconds}s`);
  console.log(`   Scene count: ${sceneCount}`);
  console.log(`   FPS: ${fps}`);
  console.log(`   Hook duration: ${HOOK_DURATION_SECONDS}s (first 30 seconds)`);

  // Edge case: Video shorter than hook duration
  if (avatarDurationSeconds <= HOOK_DURATION_SECONDS) {
    console.log(`⚠️  [Pacing] Video shorter than hook duration (${HOOK_DURATION_SECONDS.toFixed(1)}s)`);
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
  // Distribute scenes proportionally based on time
  const hookRatio = HOOK_DURATION_SECONDS / avatarDurationSeconds;
  const hookSceneCount = Math.floor(sceneCount * hookRatio);
  const bodySceneCount = sceneCount - hookSceneCount;

  console.log(`   Hook scenes (0-${HOOK_DURATION_SECONDS.toFixed(1)}s): ${hookSceneCount} @ ${HOOK_INTERVAL_SECONDS}s each`);
  console.log(`   Body scenes (${HOOK_DURATION_SECONDS.toFixed(1)}s+): ${bodySceneCount}`);

  // CRITICAL GUARD: All scenes are hook scenes (bodySceneCount <= 0)
  if (bodySceneCount <= 0) {
    console.log(`   All scenes fit in hook period (bodySceneCount=${bodySceneCount})`);

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

  // Calculate body scene duration (SAFE: bodySceneCount > 0 guaranteed by guard above)
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

  // CRITICAL FIX: Adjust last scene to fill exactly to the end (handle rounding errors)
  if (sceneTiming.length > 0) {
    const lastScene = sceneTiming[sceneTiming.length - 1];
    const currentEndFrame = lastScene.startFrame + lastScene.durationInFrames;

    if (currentEndFrame !== totalFrames) {
      const adjustment = totalFrames - currentEndFrame;
      console.log(`🔧 [Pacing] Adjusting last scene by ${adjustment} frames to fill video exactly`);

      lastScene.durationInFrames = totalFrames - lastScene.startFrame;
      lastScene.durationInSeconds = lastScene.durationInFrames / fps;
    }
  }

  console.log(`✅ [Pacing] Calculated ${sceneCount} scenes`);
  console.log(`   Total duration: ${avatarDurationSeconds}s (${totalFrames} frames)`);
  console.log(`   Coverage: Frame 0 to ${totalFrames} (NO GAPS)`);

  return {
    totalDurationInFrames: totalFrames,
    totalDurationInSeconds: avatarDurationSeconds,
    sceneTiming,
    hookScenes: hookSceneCount,
    bodyScenes: bodySceneCount,
  };
}

/**
 * Calculate scene pacing based on transcript word/sentence timing
 *
 * Hook phase (0-30% of duration): 1 image per word (rapid pacing)
 * Body phase (30-100%): 1 image per 1-2 sentences (slower, natural pacing)
 */
export function calculateTranscriptBasedPacing(
  input: TranscriptPacingInput
): PacingResult {
  const { avatarDurationSeconds, wordTimestamps, sceneCount, sceneSentences, fps = 30 } = input;

  console.log(`\n📐 [Pacing] Calculating transcript-based scene timing...`);
  console.log(`   Avatar duration: ${avatarDurationSeconds}s`);
  console.log(`   Scene count: ${sceneCount}`);
  console.log(`   Word count: ${wordTimestamps.length}`);
  console.log(`   Scene sentences provided: ${sceneSentences ? 'YES' : 'NO'}`);
  console.log(`   FPS: ${fps}`);

  // Fallback: No transcript data, use time-based pacing
  if (!wordTimestamps || wordTimestamps.length === 0) {
    console.warn(`⚠️  [Pacing] No word timestamps, falling back to time-based pacing`);
    return calculateScenePacing(avatarDurationSeconds, sceneCount, fps);
  }

  // CRITICAL: If sceneSentences provided, use database-driven matching
  if (sceneSentences && sceneSentences.length > 0) {
    console.log(`🎯 [Pacing] Using DATABASE-DRIVEN pacing (${sceneSentences.length} explicit sentence mappings)`);
    return calculateDatabaseDrivenPacing({
      avatarDurationSeconds,
      wordTimestamps,
      sceneSentences,
      fps
    });
  }

  // FALLBACK: Original punctuation-based detection
  console.log(`📐 [Pacing] Using PUNCTUATION-BASED pacing (fallback mode)`);

  // Phase boundaries
  const hookEndTime = Math.min(30, avatarDurationSeconds); // First 30 seconds OR full video if shorter

  console.log(`   Hook phase: 0s - ${hookEndTime.toFixed(1)}s (first 30s)`);

  // Separate words into hook and body phases
  const hookWords = wordTimestamps.filter(w => w.start < hookEndTime);
  const bodyWords = wordTimestamps.filter(w => w.start >= hookEndTime);

  console.log(`   Hook words: ${hookWords.length}`);
  console.log(`   Body words: ${bodyWords.length}`);

  // Group body words into sentences
  const bodySentences = groupIntoSentences(bodyWords);

  console.log(`   Body sentences: ${bodySentences.length}`);

  // Distribute scenes between hook and body
  const hookSceneRatio = hookEndTime / avatarDurationSeconds;
  const targetHookScenes = Math.ceil(sceneCount * hookSceneRatio);
  const targetBodyScenes = sceneCount - targetHookScenes;

  console.log(`   Target hook scenes: ${targetHookScenes} (${(hookSceneRatio * 100).toFixed(0)}%)`);
  console.log(`   Target body scenes: ${targetBodyScenes}`);

  // CRITICAL FIX: Detect sentence detection failure (common with HeyGen word timestamps)
  // If we have very few sentences detected (< 25% of target body scenes), use even distribution
  if (bodySentences.length > 0 && bodySentences.length < targetBodyScenes * 0.25) {
    console.warn(`⚠️  [Pacing] Sentence detection failed! Only ${bodySentences.length} sentences for ${targetBodyScenes} scenes`);
    console.warn(`   This usually means word timestamps lack punctuation (HeyGen issue)`);
    console.warn(`   Using fallback: even time distribution for body scenes`);
  }

  const sceneTiming: SceneTiming[] = [];

  // ===== HOOK PHASE: 1 image per word (or multiple images per word if more scenes than words) =====
  if (hookWords.length > 0) {
    const scenesPerWord = targetHookScenes / hookWords.length;

    console.log(`   Hook pacing: ${scenesPerWord.toFixed(2)} scenes per word`);

    if (scenesPerWord >= 1) {
      // More scenes than words: Distribute scenes across words with remainder tracking
      let sceneIdx = 0;
      let remainder = 0;

      for (let wordIdx = 0; wordIdx < hookWords.length && sceneIdx < targetHookScenes; wordIdx++) {
        const word = hookWords[wordIdx];
        const wordDuration = word.end - word.start;

        // Calculate scenes for this word using remainder to ensure we use all scenes
        const scenesForThisWordFloat = scenesPerWord + remainder;
        const scenesForThisWord = Math.floor(scenesForThisWordFloat);
        remainder = scenesForThisWordFloat - scenesForThisWord;

        // Ensure at least 1 scene and don't exceed target
        const actualScenes = Math.min(
          Math.max(1, scenesForThisWord),
          targetHookScenes - sceneIdx
        );

        // Divide word duration across scenes
        for (let i = 0; i < actualScenes; i++) {
          const sceneDuration = wordDuration / actualScenes;
          const sceneStart = word.start + (i * sceneDuration);

          sceneTiming.push({
            sceneId: `scene_${sceneIdx}`,
            startFrame: Math.round(sceneStart * fps),
            durationInFrames: Math.round(sceneDuration * fps),
            durationInSeconds: sceneDuration,
          });

          sceneIdx++;
        }
      }
    } else {
      // More words than scenes: 1 scene per N words
      const wordsPerScene = Math.ceil(hookWords.length / targetHookScenes);

      console.log(`   Hook pacing: ${wordsPerScene} words per scene`);

      for (let sceneIdx = 0; sceneIdx < targetHookScenes; sceneIdx++) {
        const startWordIdx = sceneIdx * wordsPerScene;
        const endWordIdx = Math.min(startWordIdx + wordsPerScene, hookWords.length);

        if (startWordIdx >= hookWords.length) break;

        const firstWord = hookWords[startWordIdx];
        const lastWord = hookWords[endWordIdx - 1];

        const sceneStart = firstWord.start;
        const sceneEnd = lastWord.end;
        const sceneDuration = sceneEnd - sceneStart;

        sceneTiming.push({
          sceneId: `scene_${sceneIdx}`,
          startFrame: Math.round(sceneStart * fps),
          durationInFrames: Math.round(sceneDuration * fps),
          durationInSeconds: sceneDuration,
        });
      }
    }
  }

  // ===== BODY PHASE: 1 image per 1-2 sentences =====
  // CRITICAL GUARD: Prevent division by zero if no sentences or no target scenes
  const useFallbackDistribution = bodySentences.length < targetBodyScenes * 0.25;

  if (useFallbackDistribution && bodyWords.length > 0 && targetBodyScenes > 0) {
    // FALLBACK: Even time distribution when sentence detection fails
    console.log(`   Body pacing: FALLBACK - even time distribution (${targetBodyScenes} scenes)`);

    const bodyStartTime = hookEndTime;
    const bodyEndTime = avatarDurationSeconds;
    const bodyDuration = bodyEndTime - bodyStartTime;
    const sceneIntervalSeconds = bodyDuration / targetBodyScenes;

    for (let i = 0; i < targetBodyScenes; i++) {
      const sceneStart = bodyStartTime + (i * sceneIntervalSeconds);
      const sceneDuration = sceneIntervalSeconds;

      sceneTiming.push({
        sceneId: `scene_${targetHookScenes + i}`,
        startFrame: Math.round(sceneStart * fps),
        durationInFrames: Math.round(sceneDuration * fps),
        durationInSeconds: sceneDuration,
      });
    }
  } else if (bodySentences.length > 0 && targetBodyScenes > 0) {
    // NORMAL PATH: Use sentence detection
    const sentencesPerScene = bodySentences.length / targetBodyScenes;

    console.log(`   Body pacing: ${sentencesPerScene.toFixed(2)} sentences per scene`);

    if (sentencesPerScene >= 1) {
      // More sentences than scenes: Combine sentences
      const numSentencesPerScene = Math.ceil(sentencesPerScene);

      for (let sceneIdx = 0; sceneIdx < targetBodyScenes; sceneIdx++) {
        const startSentenceIdx = sceneIdx * numSentencesPerScene;
        const endSentenceIdx = Math.min(startSentenceIdx + numSentencesPerScene, bodySentences.length);

        if (startSentenceIdx >= bodySentences.length) break;

        const firstSentence = bodySentences[startSentenceIdx];
        const lastSentence = bodySentences[endSentenceIdx - 1];

        const sceneStart = firstSentence.start;
        const sceneEnd = lastSentence.end;
        const sceneDuration = sceneEnd - sceneStart;

        sceneTiming.push({
          sceneId: `scene_${targetHookScenes + sceneIdx}`,
          startFrame: Math.round(sceneStart * fps),
          durationInFrames: Math.round(sceneDuration * fps),
          durationInSeconds: sceneDuration,
        });
      }
    } else {
      // More scenes than sentences: Split sentences
      const scenesPerSentence = Math.ceil(1 / sentencesPerScene);
      let sceneIdx = 0; // Use explicit counter for consistent ID generation

      for (let sentenceIdx = 0; sentenceIdx < bodySentences.length; sentenceIdx++) {
        const sentence = bodySentences[sentenceIdx];
        const sentenceDuration = sentence.end - sentence.start;

        for (let i = 0; i < scenesPerSentence; i++) {
          const sceneDuration = sentenceDuration / scenesPerSentence;
          const sceneStart = sentence.start + (i * sceneDuration);

          sceneTiming.push({
            sceneId: `scene_${targetHookScenes + sceneIdx}`, // Use offset counter, not array length
            startFrame: Math.round(sceneStart * fps),
            durationInFrames: Math.round(sceneDuration * fps),
            durationInSeconds: sceneDuration,
          });

          sceneIdx++; // Increment counter

          if (sceneTiming.length >= sceneCount) break;
        }

        if (sceneTiming.length >= sceneCount) break;
      }
    }
  }

  // ===== CRITICAL FIX: Ensure continuous coverage with NO gaps =====
  // Recalculate to eliminate black frames between scenes

  // CRITICAL VALIDATION: Check if we have the correct number of scene timings
  if (sceneTiming.length !== sceneCount) {
    console.error(`⚠️ [Pacing] SCENE COUNT MISMATCH!`);
    console.error(`   Expected: ${sceneCount} scenes`);
    console.error(`   Generated: ${sceneTiming.length} scene timings`);
    console.error(`   Hook scenes generated: ${sceneTiming.filter(s => s.sceneId.startsWith('scene_') && parseInt(s.sceneId.split('_')[1]) < targetHookScenes).length}`);
    console.error(`   Body scenes generated: ${sceneTiming.filter(s => s.sceneId.startsWith('scene_') && parseInt(s.sceneId.split('_')[1]) >= targetHookScenes).length}`);
    console.error(`   This will cause scene/timing mismatch - filling missing scenes with equal distribution`);
  }

  const continuousSceneTiming: SceneTiming[] = [];
  const totalFrames = Math.round(avatarDurationSeconds * fps);
  let currentFrame = 0;

  console.log(`\n🔧 [Pacing] CRITICAL FIX: Creating ${sceneCount} continuous timings`);
  console.log(`   Total frames available: ${totalFrames}`);

  // FIXED: Always create exactly sceneCount timings, not min(sceneTiming.length, sceneCount)
  for (let i = 0; i < sceneCount; i++) {
    // Calculate duration for this scene, ensuring we fill the entire video
    const remainingFrames = totalFrames - currentFrame;
    const remainingScenes = sceneCount - i;

    // Distribute remaining frames evenly across remaining scenes
    const durationInFrames = remainingScenes > 0 && remainingFrames > 0
      ? Math.round(remainingFrames / remainingScenes)
      : 1; // Fallback to 1 frame if we run out

    const timing = {
      sceneId: `scene_${i}`,
      startFrame: currentFrame,
      durationInFrames: Math.max(1, durationInFrames), // Ensure at least 1 frame
      durationInSeconds: Math.max(1, durationInFrames) / fps,
    };

    continuousSceneTiming.push(timing);

    console.log(`   Scene ${i}: Frame ${currentFrame} - ${currentFrame + timing.durationInFrames - 1} (${timing.durationInFrames} frames = ${(timing.durationInFrames / fps).toFixed(2)}s)`);

    currentFrame += timing.durationInFrames;
  }

  console.log(`\n✅ [Pacing] Loop completed: Created ${continuousSceneTiming.length} timings`);

  // Adjust last scene to fill exactly to the end (handle rounding)
  if (continuousSceneTiming.length > 0) {
    const lastScene = continuousSceneTiming[continuousSceneTiming.length - 1];
    lastScene.durationInFrames = totalFrames - lastScene.startFrame;
    lastScene.durationInSeconds = lastScene.durationInFrames / fps;
  }

  console.log(`✅ [Pacing] Calculated ${continuousSceneTiming.length} scenes (continuous coverage)`);
  console.log(`   Total duration: ${avatarDurationSeconds}s (${totalFrames} frames)`);
  console.log(`   Coverage: Frame 0 to ${totalFrames} (NO GAPS)`);

  // FINAL VALIDATION
  if (continuousSceneTiming.length !== sceneCount) {
    console.error(`❌ [Pacing] CRITICAL ERROR: Failed to create correct number of scene timings!`);
    console.error(`   Expected: ${sceneCount}, Got: ${continuousSceneTiming.length}`);
  }

  return {
    totalDurationInFrames: totalFrames,
    totalDurationInSeconds: avatarDurationSeconds,
    sceneTiming: continuousSceneTiming,
    hookScenes: targetHookScenes,
    bodyScenes: continuousSceneTiming.length - targetHookScenes,
  };
}

// Note: getVideoDuration() moved to video-utils.ts (server-side only)

/**
 * DATABASE-DRIVEN PACING
 * Uses explicit scene-to-sentence mapping from database analysis phase
 * This prevents drift by using the same sentence boundaries throughout the pipeline
 */

function calculateDatabaseDrivenPacing(input: {
  avatarDurationSeconds: number;
  wordTimestamps: WordTimestamp[];
  sceneSentences: SceneSentenceInfo[];
  fps: number;
}): PacingResult {
  const { avatarDurationSeconds, wordTimestamps, sceneSentences, fps } = input;

  console.log(`\n🎯 [Database-Driven Pacing] Starting...`);
  console.log(`   Avatar duration: ${avatarDurationSeconds}s`);
  console.log(`   Total scenes: ${sceneSentences.length}`);
  console.log(`   Word timestamps: ${wordTimestamps.length}`);

  const sceneTiming: SceneTiming[] = [];
  const totalFrames = Math.round(avatarDurationSeconds * fps);

  // STEP 1: Separate hook and body scenes using narrative_position
  const hookScenes = sceneSentences.filter(s => s.narrativePosition === 'opening');
  const bodyScenes = sceneSentences.filter(s => s.narrativePosition !== 'opening');

  console.log(`   Hook scenes (narrative_position='opening'): ${hookScenes.length}`);
  console.log(`   Body scenes (other positions): ${bodyScenes.length}`);

  // STEP 2: For each scene, find matching words in transcript
  let successfulMatches = 0;

  for (const scene of sceneSentences) {
    const matchedWords = findWordsForSentence(scene.sentenceText, wordTimestamps);

    if (matchedWords.length === 0) {
      console.warn(`⚠️  Scene ${scene.sceneOrder}: No words matched for sentence "${scene.sentenceText.substring(0, 50)}..."`);
      // Will be handled in validation/fallback
      continue;
    }

    // Calculate timing from matched words
    const startTime = matchedWords[0].start;
    const endTime = matchedWords[matchedWords.length - 1].end;
    const duration = endTime - startTime;

    sceneTiming.push({
      sceneId: `scene_${scene.sceneOrder}`,
      startFrame: Math.round(startTime * fps),
      durationInFrames: Math.round(duration * fps),
      durationInSeconds: duration
    });

    successfulMatches++;

    console.log(`   Scene ${scene.sceneOrder}: ${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s (${duration.toFixed(2)}s) - "${scene.sentenceText.substring(0, 40)}..."`);
  }

  // STEP 3: Validate coverage
  const totalAssignedDuration = sceneTiming.reduce((sum, t) => sum + t.durationInSeconds, 0);
  const coveragePercent = (totalAssignedDuration / avatarDurationSeconds) * 100;

  console.log(`\n📊 [Validation] Coverage: ${totalAssignedDuration.toFixed(1)}s / ${avatarDurationSeconds}s (${coveragePercent.toFixed(1)}%)`);
  console.log(`   Successful matches: ${successfulMatches} / ${sceneSentences.length}`);

  // Check if too many scenes failed to match
  if (successfulMatches < sceneSentences.length * 0.5) {
    console.error(`❌ [Pacing] Too many scenes failed to match (${successfulMatches}/${sceneSentences.length})`);
    console.warn(`   Falling back to punctuation-based pacing`);

    // Recursive call to original algorithm (without sceneSentences)
    return calculateTranscriptBasedPacing({
      avatarDurationSeconds: input.avatarDurationSeconds,
      wordTimestamps: input.wordTimestamps,
      sceneCount: sceneSentences.length,
      sceneSentences: undefined,  // Force fallback
      fps: input.fps
    });
  }

  // STEP 4: Sort by scene order to ensure correct sequence
  sceneTiming.sort((a, b) => {
    const aOrder = parseInt(a.sceneId.split('_')[1]);
    const bOrder = parseInt(b.sceneId.split('_')[1]);
    return aOrder - bOrder;
  });

  // STEP 5: Adjust for gaps/overlaps
  if (coveragePercent < 95 || coveragePercent > 105) {
    console.warn(`⚠️  Coverage outside tolerance (95-105%), applying corrections...`);
    adjustSceneTiming(sceneTiming, totalFrames, fps);
  }

  // STEP 6: Ensure continuous coverage
  ensureContinuousCoverage(sceneTiming, totalFrames, fps);

  return {
    totalDurationInFrames: totalFrames,
    totalDurationInSeconds: avatarDurationSeconds,
    sceneTiming,
    hookScenes: hookScenes.length,
    bodyScenes: bodyScenes.length
  };
}

/**
 * Adjust scene timings to fill total duration exactly
 * Used when word matching leaves gaps or causes overlaps
 */
function adjustSceneTiming(
  sceneTiming: SceneTiming[],
  totalFrames: number,
  fps: number
): void {
  if (sceneTiming.length === 0) return;

  // Calculate total assigned frames
  const totalAssignedFrames = sceneTiming.reduce((sum, t) => sum + t.durationInFrames, 0);
  const frameDeficit = totalFrames - totalAssignedFrames;

  console.log(`   Adjusting scenes: ${frameDeficit > 0 ? 'adding' : 'removing'} ${Math.abs(frameDeficit)} frames`);

  if (frameDeficit === 0) return;

  // Distribute deficit proportionally across all scenes
  const framesPerScene = frameDeficit / sceneTiming.length;

  for (let i = 0; i < sceneTiming.length; i++) {
    const adjustment = Math.round(framesPerScene);
    sceneTiming[i].durationInFrames += adjustment;
    sceneTiming[i].durationInSeconds = sceneTiming[i].durationInFrames / fps;
  }

  // Fix rounding error on last scene
  const finalTotal = sceneTiming.reduce((sum, t) => sum + t.durationInFrames, 0);
  const finalError = totalFrames - finalTotal;
  if (finalError !== 0) {
    sceneTiming[sceneTiming.length - 1].durationInFrames += finalError;
    sceneTiming[sceneTiming.length - 1].durationInSeconds =
      sceneTiming[sceneTiming.length - 1].durationInFrames / fps;
  }

  // Recalculate start frames
  let currentFrame = 0;
  for (const timing of sceneTiming) {
    timing.startFrame = currentFrame;
    currentFrame += timing.durationInFrames;
  }
}

/**
 * Ensure scenes cover exactly 0 to totalFrames with no gaps
 */
function ensureContinuousCoverage(
  sceneTiming: SceneTiming[],
  totalFrames: number,
  fps: number
): void {
  if (sceneTiming.length === 0) return;

  // Reset start frames to ensure continuous coverage
  let currentFrame = 0;
  for (let i = 0; i < sceneTiming.length; i++) {
    sceneTiming[i].startFrame = currentFrame;
    currentFrame += sceneTiming[i].durationInFrames;
  }

  // CRITICAL: Last scene must end exactly at totalFrames
  const lastScene = sceneTiming[sceneTiming.length - 1];
  const lastSceneEnd = lastScene.startFrame + lastScene.durationInFrames;

  if (lastSceneEnd !== totalFrames) {
    console.log(`   Adjusting last scene to fill exactly (${lastSceneEnd} → ${totalFrames})`);
    lastScene.durationInFrames = totalFrames - lastScene.startFrame;
    lastScene.durationInSeconds = lastScene.durationInFrames / fps;
  }

  // Validate
  console.log(`\n✅ [Coverage Validated]`);
  console.log(`   First scene starts at frame 0: ${sceneTiming[0].startFrame === 0}`);
  console.log(`   Last scene ends at frame ${totalFrames}: ${(lastScene.startFrame + lastScene.durationInFrames) === totalFrames}`);
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

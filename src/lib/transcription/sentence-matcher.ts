/**
 * Sentence Matching Utilities
 *
 * Fuzzy matching between sentence text and word timestamps
 * Used by both compile endpoint (to store timing) and render worker (fallback)
 */

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  confidence?: number;
}

/**
 * Find words in transcript that match a given sentence
 * Uses fuzzy matching to handle transcription variations
 *
 * @param sentenceText - The sentence to match
 * @param wordTimestamps - Array of word timestamps from Whisper
 * @returns Array of matched word timestamps
 */
export function findWordsForSentence(
  sentenceText: string,
  wordTimestamps: WordTimestamp[]
): WordTimestamp[] {
  // Normalize sentence for matching
  const normalizedSentence = sentenceText
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .split(/\s+/)
    .filter(w => w.length > 0);

  if (normalizedSentence.length === 0) {
    return [];
  }

  // Build normalized word list from timestamps
  const normalizedWords = wordTimestamps.map(w => ({
    original: w,
    normalized: w.word.toLowerCase().replace(/[^\w]/g, '')
  }));

  // Find best matching sequence using sliding window
  let bestMatch: WordTimestamp[] = [];
  let bestMatchScore = 0;

  for (let i = 0; i <= normalizedWords.length - normalizedSentence.length; i++) {
    const window = normalizedWords.slice(i, i + normalizedSentence.length);
    const score = calculateMatchScore(normalizedSentence, window.map(w => w.normalized));

    if (score > bestMatchScore) {
      bestMatchScore = score;
      bestMatch = window.map(w => w.original);
    }

    // Perfect match found
    if (score >= 0.95) {
      break;
    }
  }

  // Require at least 70% match
  if (bestMatchScore < 0.7) {
    return [];
  }

  return bestMatch;
}

/**
 * Calculate match score between sentence words and transcript words
 *
 * @returns Score between 0 and 1 (1 = perfect match)
 */
function calculateMatchScore(sentenceWords: string[], transcriptWords: string[]): number {
  if (sentenceWords.length !== transcriptWords.length) {
    return 0;
  }

  let matches = 0;
  for (let i = 0; i < sentenceWords.length; i++) {
    // Exact match
    if (sentenceWords[i] === transcriptWords[i]) {
      matches++;
    }
    // Partial match (e.g., "climate" vs "climates")
    else if (
      sentenceWords[i].startsWith(transcriptWords[i]) ||
      transcriptWords[i].startsWith(sentenceWords[i])
    ) {
      matches += 0.8;
    }
  }

  return matches / sentenceWords.length;
}

/**
 * Match all scenes to transcript words in bulk
 * Returns timing data for each scene
 *
 * @param scenes - Array of scenes with sentence_text
 * @param wordTimestamps - Array of word timestamps from Whisper
 * @returns Array of timing results for each scene
 */
export interface SceneTimingResult {
  sceneId: string;
  sceneOrder: number;
  matched: boolean;
  wordStartTime?: number;
  wordEndTime?: number;
  matchScore?: number;
}

export function matchScenesToTranscript(
  scenes: Array<{ id: string; scene_order: number; sentence_text: string | null }>,
  wordTimestamps: WordTimestamp[]
): SceneTimingResult[] {
  const results: SceneTimingResult[] = [];

  for (const scene of scenes) {
    if (!scene.sentence_text) {
      results.push({
        sceneId: scene.id,
        sceneOrder: scene.scene_order,
        matched: false
      });
      continue;
    }

    const matchedWords = findWordsForSentence(scene.sentence_text, wordTimestamps);

    if (matchedWords.length === 0) {
      results.push({
        sceneId: scene.id,
        sceneOrder: scene.scene_order,
        matched: false
      });
      continue;
    }

    results.push({
      sceneId: scene.id,
      sceneOrder: scene.scene_order,
      matched: true,
      wordStartTime: matchedWords[0].start,
      wordEndTime: matchedWords[matchedWords.length - 1].end
    });
  }

  return results;
}

/**
 * Ensure scene timing covers exactly 0 to totalFrames with no gaps
 * Simple version for when timing is already correct (just fixes rounding errors)
 *
 * @param sceneTiming - Array of scene timing objects (will be modified in place)
 * @param totalFrames - Total number of frames to cover
 */
export interface SceneTiming {
  sceneId: string;
  startFrame: number;
  durationInFrames: number;
  durationInSeconds: number;
}

export function ensureContinuousCoverageSimple(
  sceneTiming: SceneTiming[],
  totalFrames: number
): void {
  if (sceneTiming.length === 0) return;

  // Recalculate start frames to ensure continuity
  let currentFrame = 0;
  for (const timing of sceneTiming) {
    timing.startFrame = currentFrame;
    currentFrame += timing.durationInFrames;
  }

  // Adjust last scene to end exactly at totalFrames (handles rounding errors)
  const lastScene = sceneTiming[sceneTiming.length - 1];
  const currentTotal = lastScene.startFrame + lastScene.durationInFrames;

  if (currentTotal !== totalFrames) {
    const adjustment = totalFrames - currentTotal;
    lastScene.durationInFrames += adjustment;
    lastScene.durationInSeconds = lastScene.durationInFrames / 30; // Assuming 30fps
  }
}

/**
 * Scene Segmentation Module
 *
 * Groups sentences into broader "scenes" (4-7 sentences each) that provide
 * context for AI image generation, while maintaining sentence-level granularity.
 *
 * Hook Handling: First 30s of content uses sub-sentence splitting for rapid pacing (1.5s/image)
 * Body Handling: Remaining content uses semantic grouping (4-7 sentences per scene)
 */

import { SegmentedSentence } from './script-segmenter';

export interface SubSentence {
  index: number;
  text: string;
  parentSentenceIndex: number;
}

export interface BroadScene {
  id: number;
  sentences: SegmentedSentence[];        // 4-7 sentences (or sub-sentences in hook)
  subSentences?: SubSentence[];          // Only populated for hook scenes
  isHook: boolean;                       // true for first 30s worth of content
  topic: string;                         // e.g., "Climate bill passage"
  visualTheme: {
    setting: string;                     // e.g., "Capitol exterior and interior"
    mood: string;                        // e.g., "urgent, historic"
    colorPalette: string;                // e.g., "warm golden tones"
    timeOfDay: string;                   // e.g., "golden hour"
  };
}

/**
 * Splits a sentence into sub-sentences for hook phase (rapid pacing)
 *
 * Target: 2-3 sub-sentences per sentence
 * Each sub-sentence will get its own image at 1.5s duration
 */
function splitIntoSubSentences(sentence: string): string[] {
  // Split on natural breaks: conjunctions, commas, clauses
  const subSentences: string[] = [];

  // Strategy 1: Split on coordinating conjunctions (and, but, or)
  const conjunctionSplit = sentence.split(/\s+(and|but|or|yet|so)\s+/i);

  if (conjunctionSplit.length > 1) {
    // Recombine with conjunctions
    let current = '';
    for (let i = 0; i < conjunctionSplit.length; i++) {
      if (i % 2 === 0) {
        // Text segment
        current += conjunctionSplit[i];
        if (i === conjunctionSplit.length - 1) {
          // Last segment
          subSentences.push(current.trim());
        }
      } else {
        // Conjunction
        if (current.trim()) {
          subSentences.push(current.trim());
        }
        current = conjunctionSplit[i] + ' ' + (conjunctionSplit[i + 1] || '');
        if (i === conjunctionSplit.length - 2) {
          // Last conjunction + text
          subSentences.push(current.trim());
          break;
        }
        i++; // Skip next text segment (already included)
        current = '';
      }
    }
  } else {
    // Strategy 2: Split on commas (if no conjunctions)
    const commaSplit = sentence.split(',').map(s => s.trim()).filter(s => s.length > 0);

    if (commaSplit.length > 1) {
      subSentences.push(...commaSplit);
    } else {
      // Strategy 3: Split long sentences in half (if no commas)
      const words = sentence.split(/\s+/);
      if (words.length > 10) {
        const midpoint = Math.floor(words.length / 2);
        subSentences.push(
          words.slice(0, midpoint).join(' '),
          words.slice(midpoint).join(' ')
        );
      } else {
        // Short sentence: keep as-is
        subSentences.push(sentence);
      }
    }
  }

  return subSentences.filter(s => s.length > 3); // Filter out very short fragments
}

/**
 * Estimates duration per sentence based on total avatar duration
 */
function estimateSentenceDuration(
  totalSentences: number,
  avatarDurationSeconds: number
): number {
  return avatarDurationSeconds / totalSentences;
}

/**
 * Determines hook boundary: how many sentences fit in first 30s
 */
function calculateHookBoundary(
  sentences: SegmentedSentence[],
  avatarDurationSeconds: number
): number {
  const avgDurationPerSentence = estimateSentenceDuration(sentences.length, avatarDurationSeconds);
  const hookSentenceCount = Math.ceil(30 / avgDurationPerSentence);

  // Clamp to reasonable bounds (at least 10% of script, at most 40%)
  const minHookSentences = Math.ceil(sentences.length * 0.1);
  const maxHookSentences = Math.ceil(sentences.length * 0.4);

  return Math.max(minHookSentences, Math.min(hookSentenceCount, maxHookSentences));
}

/**
 * Detects if there's a topic change between two sentences
 *
 * Simple heuristic: Check for new proper nouns or significant keyword shifts
 */
function detectTopicChange(current: SegmentedSentence, next: SegmentedSentence | null): boolean {
  if (!next) return true; // End of script

  // Narrative position change often indicates topic shift
  if (current.narrativePosition !== next.narrativePosition) {
    return true;
  }

  // TODO: Could add more sophisticated topic detection here
  // - Named entity recognition
  // - Keyword extraction and comparison
  // - Sentence embedding similarity

  return false;
}

/**
 * Infers visual theme for a group of sentences
 *
 * Analyzes sentence content to suggest consistent visual style
 */
function inferVisualTheme(sentences: SegmentedSentence[]): {
  setting: string;
  mood: string;
  colorPalette: string;
  timeOfDay: string;
} {
  const combinedText = sentences.map(s => s.text).join(' ').toLowerCase();

  // Detect setting
  let setting = 'generic location';
  if (combinedText.includes('capitol') || combinedText.includes('senate') || combinedText.includes('congress')) {
    setting = 'US Capitol building, interior and exterior';
  } else if (combinedText.includes('white house')) {
    setting = 'White House, press room and exterior';
  } else if (combinedText.includes('court')) {
    setting = 'courtroom and legal environment';
  } else if (combinedText.includes('factory') || combinedText.includes('manufacturing')) {
    setting = 'industrial facility, factory floor';
  } else if (combinedText.includes('hospital') || combinedText.includes('medical')) {
    setting = 'hospital, medical facility';
  } else if (combinedText.includes('school') || combinedText.includes('university')) {
    setting = 'educational institution';
  } else if (combinedText.includes('city') || combinedText.includes('urban')) {
    setting = 'urban cityscape';
  }

  // Detect mood
  let mood = 'neutral, informative';
  if (combinedText.includes('crisis') || combinedText.includes('urgent') || combinedText.includes('emergency')) {
    mood = 'urgent, serious, high tension';
  } else if (combinedText.includes('celebrate') || combinedText.includes('victory') || combinedText.includes('success')) {
    mood = 'celebratory, optimistic';
  } else if (combinedText.includes('concern') || combinedText.includes('worry') || combinedText.includes('fear')) {
    mood = 'concerned, cautious';
  } else if (combinedText.includes('historic') || combinedText.includes('landmark')) {
    mood = 'historic, significant';
  }

  // Detect color palette
  let colorPalette = 'neutral broadcast tones';
  if (sentences[0].narrativePosition === 'opening') {
    colorPalette = 'warm golden tones, inviting';
  } else if (sentences[0].narrativePosition === 'evidence') {
    colorPalette = 'cool professional tones, factual';
  } else if (mood.includes('urgent')) {
    colorPalette = 'high contrast, dramatic';
  }

  // Detect time of day
  let timeOfDay = 'daytime, natural lighting';
  if (combinedText.includes('night') || combinedText.includes('evening')) {
    timeOfDay = 'evening or nighttime';
  } else if (combinedText.includes('morning') || combinedText.includes('dawn')) {
    timeOfDay = 'early morning, soft light';
  } else if (combinedText.includes('afternoon')) {
    timeOfDay = 'afternoon, bright natural light';
  }

  return { setting, mood, colorPalette, timeOfDay };
}

/**
 * Generates a topic summary for a group of sentences
 */
function generateTopic(sentences: SegmentedSentence[]): string {
  const text = sentences.map(s => s.text).join(' ');

  // Extract key phrases (simple heuristic: capitalized words)
  const capitalizedWords = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || [];
  const uniqueCapitalized = Array.from(new Set(capitalizedWords)).slice(0, 3);

  if (uniqueCapitalized.length > 0) {
    return uniqueCapitalized.join(', ');
  }

  // Fallback: First sentence truncated
  return sentences[0].text.slice(0, 50) + (sentences[0].text.length > 50 ? '...' : '');
}

/**
 * Groups body sentences into scenes of 4-7 sentences
 */
function groupBodySentences(sentences: SegmentedSentence[]): BroadScene[] {
  const scenes: BroadScene[] = [];
  let currentGroup: SegmentedSentence[] = [];
  let sceneId = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const next = i < sentences.length - 1 ? sentences[i + 1] : null;

    currentGroup.push(sentence);

    // Decide if we should close this scene
    const shouldClose =
      currentGroup.length >= 7 || // Max size reached
      (currentGroup.length >= 4 && detectTopicChange(sentence, next)) || // Natural boundary
      i === sentences.length - 1; // Last sentence

    if (shouldClose) {
      scenes.push({
        id: sceneId++,
        sentences: [...currentGroup],
        isHook: false,
        topic: generateTopic(currentGroup),
        visualTheme: inferVisualTheme(currentGroup),
      });
      currentGroup = [];
    }
  }

  // Handle leftover sentences (< 4 sentences remaining)
  if (currentGroup.length > 0) {
    if (scenes.length > 0) {
      // Merge with last scene
      const lastScene = scenes[scenes.length - 1];
      lastScene.sentences.push(...currentGroup);
      lastScene.visualTheme = inferVisualTheme(lastScene.sentences);
      lastScene.topic = generateTopic(lastScene.sentences);
    } else {
      // Edge case: Very short script
      scenes.push({
        id: sceneId++,
        sentences: currentGroup,
        isHook: false,
        topic: generateTopic(currentGroup),
        visualTheme: inferVisualTheme(currentGroup),
      });
    }
  }

  return scenes;
}

/**
 * Segments script into broad scenes with context windows
 *
 * @param sentences - Segmented sentences from script-segmenter.ts
 * @param avatarDurationSeconds - Total avatar video duration (for hook boundary calculation)
 * @returns Array of broad scenes (hook + body)
 */
export function segmentIntoScenes(
  sentences: SegmentedSentence[],
  avatarDurationSeconds: number
): BroadScene[] {
  console.log(`\n📋 [Scene Segmenter] Segmenting ${sentences.length} sentences into broad scenes...`);
  console.log(`   Avatar duration: ${avatarDurationSeconds}s`);

  const hookBoundary = calculateHookBoundary(sentences, avatarDurationSeconds);
  const hookSentences = sentences.slice(0, hookBoundary);
  const bodySentences = sentences.slice(hookBoundary);

  console.log(`   Hook boundary: ${hookBoundary} sentences (~30s of content)`);
  console.log(`   Body sentences: ${bodySentences.length}`);

  const scenes: BroadScene[] = [];

  // ===== HOOK SCENE: Sub-sentence splitting for rapid pacing =====
  if (hookSentences.length > 0) {
    const allSubSentences: SubSentence[] = [];
    let subIndex = 0;

    hookSentences.forEach((sentence, parentIndex) => {
      const subs = splitIntoSubSentences(sentence.text);
      subs.forEach(subText => {
        allSubSentences.push({
          index: subIndex++,
          text: subText,
          parentSentenceIndex: sentence.index,
        });
      });
    });

    console.log(`   Hook: ${hookSentences.length} sentences → ${allSubSentences.length} sub-sentences`);

    scenes.push({
      id: 0,
      sentences: hookSentences,
      subSentences: allSubSentences,
      isHook: true,
      topic: 'Opening hook',
      visualTheme: {
        setting: 'establishing context',
        mood: 'engaging, attention-grabbing',
        colorPalette: 'warm golden tones',
        timeOfDay: 'golden hour or daytime',
      },
    });
  }

  // ===== BODY SCENES: 4-7 sentences per scene =====
  if (bodySentences.length > 0) {
    const bodyScenes = groupBodySentences(bodySentences);

    // Re-number scene IDs
    bodyScenes.forEach((scene, idx) => {
      scene.id = scenes.length + idx;
    });

    scenes.push(...bodyScenes);

    console.log(`   Body: ${bodySentences.length} sentences → ${bodyScenes.length} scenes`);
  }

  console.log(`✅ [Scene Segmenter] Segmented into ${scenes.length} broad scenes`);

  return scenes;
}

/**
 * Utility: Get total prompt count from scenes
 *
 * Hook scenes use sub-sentence count, body scenes use sentence count
 */
export function getTotalPromptCount(scenes: BroadScene[]): number {
  let total = 0;

  scenes.forEach(scene => {
    if (scene.isHook && scene.subSentences) {
      total += scene.subSentences.length;
    } else {
      total += scene.sentences.length;
    }
  });

  return total;
}

/**
 * Utility: Flatten scenes back to sentence-level prompts
 *
 * This converts the scene-based output back to the flat sentence-level format
 * expected by the database and rendering pipeline
 */
export interface FlattenedPrompt {
  sentenceIndex: number;
  sentenceText: string;
  imagePrompt: string;
  shotType: string;
  tickerHeadline: string;
  narrativePosition: string;
  visualContinuityNotes?: string;
}

export function flattenScenePrompts(
  scenes: BroadScene[],
  scenePrompts: any[] // ScenePromptOutput from types (to be defined)
): FlattenedPrompt[] {
  const flattened: FlattenedPrompt[] = [];

  scenePrompts.forEach((scenePrompt, sceneIdx) => {
    const scene = scenes[sceneIdx];

    if (!scene) {
      console.warn(`⚠️  [Scene Segmenter] Missing scene data for scene ${sceneIdx}`);
      return;
    }

    // Hook scene: Map sub-sentences
    if (scene.isHook && scene.subSentences) {
      scene.subSentences.forEach((subSent, subIdx) => {
        if (scenePrompt.sentence_prompts && scenePrompt.sentence_prompts[subIdx]) {
          const prompt = scenePrompt.sentence_prompts[subIdx];
          flattened.push({
            sentenceIndex: subSent.parentSentenceIndex,
            sentenceText: subSent.text,
            imagePrompt: prompt.image_prompt,
            shotType: prompt.shot_type,
            tickerHeadline: prompt.ticker_headline,
            narrativePosition: 'opening', // Hook is always opening
            visualContinuityNotes: prompt.visual_continuity_notes,
          });
        }
      });
    } else {
      // Body scene: Map full sentences
      scene.sentences.forEach((sent, sentIdx) => {
        if (scenePrompt.sentence_prompts && scenePrompt.sentence_prompts[sentIdx]) {
          const prompt = scenePrompt.sentence_prompts[sentIdx];
          flattened.push({
            sentenceIndex: sent.index,
            sentenceText: sent.text,
            imagePrompt: prompt.image_prompt,
            shotType: prompt.shot_type,
            tickerHeadline: prompt.ticker_headline,
            narrativePosition: sent.narrativePosition,
            visualContinuityNotes: prompt.visual_continuity_notes,
          });
        }
      });
    }
  });

  return flattened;
}

import { SegmentedSentence } from '../script-segmenter';
import { formatVisualGuidelinesForPrompt, getShotTypeRecommendation } from './visual-guidelines';

interface StyleContext {
  visualStyle?: string;
  colorPalette?: string;
  compositionRules?: string;
  referenceImages?: string[];
}

/**
 * System prompt for script analysis with documentary cinematography guidelines
 *
 * @param styleContext - Optional rich visual style configuration from style presets
 */
export const SCRIPT_ANALYZER_SYSTEM_PROMPT = (styleContext?: StyleContext) => {
  const basePrompt = `You are a professional news video production AI assistant specializing in documentary-style visual storytelling.

Your task is to transform news scripts into visual scenes with explicit sentence-to-scene mapping, ensuring that images align perfectly with narration timing.

# Output Requirements

You must return ONLY a valid JSON object (no markdown, no explanations) with this exact structure:

{
  "scenes": [
    {
      "id": 0,
      "sentence_text": "The exact sentence from the script this scene visualizes",
      "image_prompt": "Detailed image generation prompt matching this specific sentence",
      "shot_type": "establishing" | "medium" | "closeup" | "detail",
      "ticker_headline": "SHORT HEADLINE FOR THIS SENTENCE",
      "narrative_position": "opening" | "development" | "evidence" | "conclusion",
      "visual_continuity_notes": "How this scene connects to previous/next scenes"
    }
  ]
}

${formatVisualGuidelinesForPrompt()}

# Critical Rules for Image Prompts

**MOST IMPORTANT: Each image_prompt must match the SPECIFIC SENTENCE it visualizes, not the general topic.**

✅ CORRECT APPROACH:
- Sentence: "The Senate passed the climate bill today."
  → Image: "Wide establishing shot of US Capitol building exterior, daytime, professional news photography"
- Sentence: "This marks a historic moment for environmental policy."
  → Image: "Medium shot of celebrating environmental activists holding signs, natural lighting, documentary style"

❌ WRONG APPROACH (DO NOT DO THIS):
- Using the same "Capitol building" image for multiple sentences about the bill
- Creating an image about "climate policy in general" rather than the specific sentence

Each image_prompt must:
- Be directly tied to the sentence_text provided
- Include specific shot type (establishing/medium/closeup/detail)
- Describe concrete visual elements (not abstract concepts)
- Specify "photorealistic news imagery" or "professional documentary style"
- Avoid people's faces unless specifically mentioned in sentence
- Match the narrative moment (opening = context, development = content, evidence = details, conclusion = wrap-up)
- Consider what came before and after for visual continuity

# Visual Continuity Guidelines

**Think sequentially:** Each scene is part of a narrative flow, not an isolated image.

For visual_continuity_notes, explain:
- How this scene connects to the previous one (shared location, visual thread, thematic link)
- Why this shot type was chosen for this narrative moment
- What visual element carries forward to the next scene

Examples:
- "Opens story with establishing shot of factory exterior, setting industrial context for manufacturing discussion"
- "Transitions from exterior to interior, showing workers on factory floor to maintain location continuity"
- "Close-up on assembly line detail emphasizes precision mentioned in sentence, while staying in factory environment"
- "Returns to wide shot for conclusion, showing full factory operation as wrap-up"

${styleContext?.visualStyle ? `\n# Style Preset: Visual Guidelines\n\n${styleContext.visualStyle}\n` : ''}
${styleContext?.colorPalette ? `\n# Color Palette\n\n${styleContext.colorPalette}\n` : ''}
${styleContext?.compositionRules ? `\n# Composition Rules\n\n${styleContext.compositionRules}\n` : ''}

Remember: Your output must be ONLY the JSON object, nothing else.`;

  return basePrompt;
};

/**
 * User prompt with segmented script and explicit sentence-to-scene mapping table
 *
 * @param segmentedScript - Array of sentences with context windows and narrative position
 * @param stylePresetName - Optional name of style preset being used
 */
export const SCRIPT_ANALYZER_USER_PROMPT = (
  segmentedScript: SegmentedSentence[],
  stylePresetName?: string
) => {
  const totalScenes = segmentedScript.length;

  // Build sentence table for AI
  const sentenceTable = segmentedScript
    .map((sentence, idx) => {
      const recommendedShots = getShotTypeRecommendation(
        sentence.narrativePosition,
        idx,
        totalScenes
      );

      return `
## Scene ${idx} | ${sentence.narrativePosition.toUpperCase()}

**Sentence to visualize:**
"${sentence.text}"

**Context:**
- Previous sentence: ${sentence.contextWindow.previous ? `"${sentence.contextWindow.previous}"` : 'N/A (first sentence)'}
- Next sentence: ${sentence.contextWindow.next ? `"${sentence.contextWindow.next}"` : 'N/A (last sentence)'}

**Recommended shot types:** ${recommendedShots.join(', ')}

**Your task:** Generate an image_prompt that visualizes THIS specific sentence, considering:
1. What is being said in THIS sentence (not the topic in general)
2. What visual elements from the previous scene can carry forward
3. What shot type best serves this narrative moment
4. How to maintain visual coherence with surrounding scenes
`;
    })
    .join('\n---\n');

  return `Analyze this news script and create visual scenes with EXPLICIT sentence-to-scene mapping.

${stylePresetName ? `**Style Preset:** ${stylePresetName}\n` : ''}
**Total Scenes to Generate:** ${totalScenes} (one per sentence)

# Sentence-to-Scene Mapping Table

You MUST generate exactly ${totalScenes} scenes, one for each sentence below. Each scene must have:
1. **sentence_text** - Copy the exact sentence text from below
2. **image_prompt** - Visual description matching THAT SPECIFIC sentence (not the general topic)
3. **shot_type** - Choose from recommended shots or use judgment
4. **ticker_headline** - Short headline for THIS sentence
5. **narrative_position** - Already provided for each sentence
6. **visual_continuity_notes** - Explain how this scene flows from previous and into next

${sentenceTable}

---

# Final Instructions

1. **Count verification:** You must generate exactly ${totalScenes} scenes (no more, no less)
2. **Sentence matching:** Each scene's image_prompt must match its specific sentence_text
3. **Visual flow:** Think sequentially - each scene should feel connected to the previous one
4. **Shot variety:** Vary shot types to prevent monotony (don't use the same type 5+ times in a row)
5. **Narrative pacing:** Opening = establish context, Development = main content, Evidence = details/facts, Conclusion = wrap-up

**Shot Type Distribution Target (for ${totalScenes} scenes):**
- Establishing: ${Math.ceil(totalScenes * 0.15)} scenes (15-20%)
- Medium: ${Math.ceil(totalScenes * 0.55)} scenes (50-60%)
- Closeup: ${Math.ceil(totalScenes * 0.175)} scenes (15-20%)
- Detail: ${Math.ceil(totalScenes * 0.125)} scenes (10-15%)

Return ONLY the JSON object with the scenes array. No markdown, no explanations.`;
};

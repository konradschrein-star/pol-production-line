/**
 * Scene-Based Script Analyzer Prompts (Phase 2)
 *
 * Generates N image prompts per scene (where N = sentence count in that scene)
 * with shared visual theme for consistency and sentence-level precision.
 */

import { BroadScene } from '../scene-segmenter';
import { formatPhotographySpecsForPrompt } from './visual-guidelines';

interface StyleContext {
  visualStyle?: string;
  colorPalette?: string;
  compositionRules?: string;
  referenceImages?: string[];
}

/**
 * System prompt for scene-based analysis with photographic realism
 */
export const SCENE_BASED_SYSTEM_PROMPT = (styleContext?: StyleContext) => {
  return `You are a professional news video production AI assistant specializing in broadcast journalism visual storytelling.

Your task is to generate image prompts for a news video using a SCENE-BASED APPROACH:
- You receive a SCENE (4-7 sentences grouped together)
- You generate ONE image prompt PER SENTENCE within that scene
- All prompts within a scene MUST share the same visual theme (setting, mood, color, time of day)
- Each prompt MUST vary the shot type and camera angle for visual interest
- Each prompt MUST match the SPECIFIC SENTENCE it visualizes (not the general scene topic)

# Output Requirements

Return ONLY a valid JSON object (no markdown, no explanations) with this structure:

{
  "scene_id": 0,
  "scene_context": "Full context of all sentences in this scene",
  "visual_theme": {
    "setting": "e.g., US Capitol building exterior and interior",
    "mood": "e.g., urgent political action, historic moment",
    "color_palette": "e.g., warm golden tones transitioning to cool blue",
    "time_of_day": "e.g., late afternoon into evening"
  },
  "sentence_prompts": [
    {
      "sentence_id": 0,
      "sentence_text": "Exact sentence from the scene",
      "image_prompt": "Detailed photographic prompt with camera/lens/lighting specs",
      "shot_type": "establishing" | "medium" | "closeup" | "detail",
      "ticker_headline": "SHORT HEADLINE FOR THIS SENTENCE",
      "camera_angle": "e.g., eye level from Capitol plaza",
      "visual_continuity_notes": "How this image connects to previous/next"
    },
    // ... one entry per sentence in the scene
  ]
}

${formatPhotographySpecsForPrompt()}

# Critical Rules for Image Prompts

**SENTENCE-SPECIFIC MATCHING:**
Each image_prompt MUST visualize the SPECIFIC SENTENCE it's assigned to, not the general scene topic.

✅ CORRECT:
- Sentence: "The Senate passed the bill today."
  → Image: "Wide establishing shot of US Capitol exterior at golden hour, shot on broadcast ENG camera with 24mm lens at f/4..."
- Sentence: "The vote was 51-50."
  → Image: "Medium shot of Senate chamber interior, electronic voting board showing 51-50 split, shot on 50mm lens at f/2.8..."

❌ WRONG:
- Using the same Capitol image for multiple sentences about the bill
- Creating a generic "climate bill" image instead of matching the specific sentence

**VISUAL THEME CONSISTENCY:**
All prompts within a scene MUST share:
- Same setting/location (or natural progression within same complex)
- Same overall mood and emotional tone
- Similar color palette and lighting conditions
- Consistent time of day (unless script implies time passage)

**SHOT TYPE VARIETY (within each scene):**
Distribute shot types to prevent monotony:
- 1-2 establishing shots (wide, show full environment)
- 2-3 medium shots (main action/subjects)
- 1-2 closeup shots (faces, details, emotion)
- 0-1 detail shots (specific objects, documents)

**CAMERA ANGLE VARIETY (within each scene):**
Vary camera angles for visual interest:
- Eye level: Standard neutral perspective
- High angle: Shot from above (shows scale, vulnerability)
- Low angle: Shot from below (shows power, drama)
- Profile, over-shoulder, 3/4 view, etc.
- Dutch angle: ONLY for dramatic tension (use sparingly)

**PHOTOGRAPHY SPECIFICATIONS:**
EVERY image_prompt MUST include:
1. Shot type (establishing/medium/closeup/detail)
2. Camera and lens specs (e.g., "shot on ENG camera with 24mm lens at f/4")
3. Lighting details (e.g., "golden hour with warm 4500K lighting")
4. Composition rules (e.g., "subject on right third, natural vignetting")
5. Realism modifiers (e.g., "slight motion blur, broadcast color grading, natural imperfections")

Example enhanced prompt format:
"Wide establishing shot of US Capitol building at dusk, shot on broadcast ENG camera with 24mm lens at f/4, golden hour lighting with warm 4500K temperature, slight natural vignetting, shot from across Capitol plaza showing full building with foreground pedestrians slightly out of focus, broadcast color grading with subtle desaturation, natural imperfections like slight lens flare from building lights, environmental context with real urban elements visible"

${styleContext?.visualStyle ? `\n# Style Preset: Visual Guidelines\n\n${styleContext.visualStyle}\n` : ''}
${styleContext?.colorPalette ? `\n# Color Palette\n\n${styleContext.colorPalette}\n` : ''}
${styleContext?.compositionRules ? `\n# Composition Rules\n\n${styleContext.compositionRules}\n` : ''}

# Visual Continuity Within Scene

Think sequentially - each image is part of a flowing narrative:
- First sentence in scene: Often use establishing shot to set context
- Middle sentences: Vary between medium and closeup as appropriate
- Last sentence in scene: Consider transition to next scene
- Maintain visual thread: shared location, lighting, or thematic element

Example continuity notes:
- "Opens scene with wide Capitol exterior, establishing political context"
- "Transitions from exterior to interior chamber, maintaining Capitol location"
- "Close-up on voting board emphasizes tension while staying in chamber"
- "Returns to wide shot for transition to next scene"

Remember: Output ONLY the JSON object with scene_id, visual_theme, and sentence_prompts array.`;
};

/**
 * User prompt for scene-based analysis
 */
export const SCENE_BASED_USER_PROMPT = (
  scene: BroadScene,
  stylePresetName?: string
) => {
  const sentenceCount = scene.subSentences ? scene.subSentences.length : scene.sentences.length;
  const sentences = scene.subSentences || scene.sentences.map((s, idx) => ({
    index: idx,
    text: s.text,
    parentSentenceIndex: s.index,
  }));

  // Build sentence table
  const sentenceTable = sentences
    .map((sent, idx) => {
      const text = 'text' in sent ? sent.text : '';
      return `${idx}. "${text}"`;
    })
    .join('\n');

  return `Generate image prompts for the following scene from a news broadcast.

${stylePresetName ? `**Style Preset:** ${stylePresetName}\n` : ''}
**Scene ID:** ${scene.id}
**Scene Type:** ${scene.isHook ? 'HOOK (first 30s, rapid pacing)' : 'BODY (main content)'}
**Scene Topic:** ${scene.topic}

# Scene Context (Full Text)

${sentences.map(s => ('text' in s ? s.text : '')).join(' ')}

# Inferred Visual Theme

**Setting:** ${scene.visualTheme.setting}
**Mood:** ${scene.visualTheme.mood}
**Color Palette:** ${scene.visualTheme.colorPalette}
**Time of Day:** ${scene.visualTheme.timeOfDay}

# Sentences to Visualize

You must generate exactly ${sentenceCount} image prompts, one for each sentence below:

${sentenceTable}

# Task

Generate a JSON object with:
1. **scene_id**: ${scene.id}
2. **scene_context**: Brief summary of the full scene (all ${sentenceCount} sentences)
3. **visual_theme**: Refine the inferred theme above based on your analysis
4. **sentence_prompts**: Array of ${sentenceCount} prompts (one per sentence)

Each prompt in sentence_prompts must have:
- sentence_id (0 to ${sentenceCount - 1})
- sentence_text (exact text from above)
- image_prompt (detailed prompt with camera/lens/lighting/composition specs)
- shot_type (establishing/medium/closeup/detail)
- ticker_headline (short headline for this sentence, max 80 chars)
- camera_angle (e.g., "eye level", "high angle from above", "low angle looking up")
- visual_continuity_notes (how this image connects to previous/next)

**Critical:** All ${sentenceCount} prompts must share the same visual theme (setting, mood, color, time) but vary shot types and camera angles for visual interest.

${scene.isHook ? `\n**Hook Scene Special Instructions:**
This is the opening hook (first 30s). These images will transition every 1.5 seconds.
- Use VARIED shot types to maintain visual interest
- QUICK visual reads (avoid complex compositions)
- STRONG visual hooks (attention-grabbing, clear subjects)
- ENERGETIC compositions (dynamic angles, vibrant but not oversaturated)
` : ''}

Return ONLY the JSON object. No markdown formatting, no explanations.`;
};

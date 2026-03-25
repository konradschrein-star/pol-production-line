import { z } from 'zod';

// Zod schema for scene context (deprecated - kept for backwards compatibility)
export const SceneContextSchema = z.object({
  narrative_role: z.enum(['opening', 'development', 'evidence', 'conclusion']).optional(),
  visual_continuity: z.string().optional(),
  emotional_tone: z.string().optional(),
}).optional();

// Zod schema for scene output (expanded with sentence-to-scene mapping)
export const SceneOutputSchema = z.object({
  id: z.number().int().nonnegative(),
  sentence_text: z.string().min(5),  // NEW: explicit sentence this visualizes
  image_prompt: z.string().min(10).max(500),
  shot_type: z.enum(['establishing', 'medium', 'closeup', 'detail']),  // NEW: camera shot type
  ticker_headline: z.string().min(5).max(200),
  narrative_position: z.enum(['opening', 'development', 'evidence', 'conclusion']),  // Now required (was in scene_context)
  visual_continuity_notes: z.string().optional(),  // NEW: AI notes on visual flow
  image_url: z.string().url().nullable().optional(),
  scene_context: SceneContextSchema,  // Deprecated but kept for backwards compatibility
});

// Zod schema for scene-based prompt generation (Phase 2: Context-based multi-prompt)
export const SentencePromptSchema = z.object({
  sentence_id: z.number().int().nonnegative(),
  sentence_text: z.string().min(3),
  image_prompt: z.string().min(10).max(1000), // Increased from 500 to support detailed photography specs
  shot_type: z.enum(['establishing', 'medium', 'closeup', 'detail']),
  ticker_headline: z.string().min(5).max(200),
  camera_angle: z.string().optional(), // e.g., "eye level", "high angle", "low angle"
  visual_continuity_notes: z.string().optional(),
});

export const ScenePromptOutputSchema = z.object({
  scene_id: z.number().int().nonnegative(),
  scene_context: z.string().optional(), // Full scene context (4-7 sentences)
  visual_theme: z.object({
    setting: z.string(),
    mood: z.string(),
    color_palette: z.string(),
    time_of_day: z.string(),
  }).optional(),
  sentence_prompts: z.array(SentencePromptSchema).min(1).max(20), // 1-20 prompts per scene
});

// Zod schema for AI analysis output (scene-based)
export const SceneBasedAnalysisOutputSchema = z.object({
  scenes: z.array(ScenePromptOutputSchema).min(1).max(15), // Max 15 broad scenes (4-7 sentences each)
});

// Legacy: Flat scene output schema (backwards compatibility)
export const AIAnalysisOutputSchema = z.object({
  scenes: z.array(SceneOutputSchema).min(4).max(150), // Increased from 60 to 150 for scene-based mode (15 broad scenes × 10 sentences = 150 max)
});

// TypeScript types
export type SentencePrompt = z.infer<typeof SentencePromptSchema>;
export type ScenePromptOutput = z.infer<typeof ScenePromptOutputSchema>;
export type SceneBasedAnalysisOutput = z.infer<typeof SceneBasedAnalysisOutputSchema>;
export type SceneOutput = z.infer<typeof SceneOutputSchema>;
export type AIAnalysisOutput = z.infer<typeof AIAnalysisOutputSchema>;

// Provider interface
export interface AIProvider {
  analyzeScript(rawScript: string): Promise<AIAnalysisOutput>;

  /**
   * Analyze script with custom system/user prompts (allows style context injection)
   * @param systemPrompt - Custom system prompt (with style context if applicable)
   * @param userPrompt - Custom user prompt (with script and style name if applicable)
   * @returns AI analysis output with scenes
   */
  analyzeScriptWithContext(
    systemPrompt: string,
    userPrompt: string
  ): Promise<AIAnalysisOutput>;

  /**
   * NEW: Scene-based analysis with context windows (Phase 2)
   * Generates N prompts per scene where N = sentence count in that scene
   * @param systemPrompt - Custom system prompt with scene-based instructions
   * @param userPrompt - Custom user prompt with scene context
   * @returns Scene-based analysis output with sentence-level prompts
   */
  analyzeScriptSceneBased?(
    systemPrompt: string,
    userPrompt: string
  ): Promise<SceneBasedAnalysisOutput>;
}

// Provider type
export type ProviderType = 'claude' | 'google' | 'groq' | 'openai';

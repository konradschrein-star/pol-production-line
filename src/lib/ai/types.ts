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

// Zod schema for AI analysis output
export const AIAnalysisOutputSchema = z.object({
  scenes: z.array(SceneOutputSchema).min(4).max(30), // Increased from 12 to 30 for better pacing
});

// TypeScript types
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
}

// Provider type
export type ProviderType = 'claude' | 'google' | 'groq' | 'openai';

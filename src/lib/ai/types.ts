import { z } from 'zod';

// Zod schema for scene output
export const SceneOutputSchema = z.object({
  id: z.number().int().positive(),
  image_prompt: z.string().min(10).max(500),
  ticker_headline: z.string().min(5).max(200),
  image_url: z.string().url().nullable(),
});

// Zod schema for AI analysis output
export const AIAnalysisOutputSchema = z.object({
  scenes: z.array(SceneOutputSchema).min(4).max(12),
});

// TypeScript types
export type SceneOutput = z.infer<typeof SceneOutputSchema>;
export type AIAnalysisOutput = z.infer<typeof AIAnalysisOutputSchema>;

// Provider interface
export interface AIProvider {
  analyzeScript(rawScript: string): Promise<AIAnalysisOutput>;
}

// Provider type
export type ProviderType = 'claude' | 'google' | 'groq' | 'openai';

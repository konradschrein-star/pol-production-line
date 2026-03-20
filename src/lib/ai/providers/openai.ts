import OpenAI from 'openai';
import { AIProvider, AIAnalysisOutput, AIAnalysisOutputSchema } from '../types';
import { SCRIPT_ANALYZER_SYSTEM_PROMPT, SCRIPT_ANALYZER_USER_PROMPT } from '../prompts/script-analyzer';

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async analyzeScript(rawScript: string): Promise<AIAnalysisOutput> {
    try {
      const completion = await this.client.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: SCRIPT_ANALYZER_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: SCRIPT_ANALYZER_USER_PROMPT(rawScript),
          },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });

      const responseText = completion.choices[0].message.content;

      if (!responseText) {
        throw new Error('Empty response from OpenAI');
      }

      // Parse JSON
      const parsed = JSON.parse(responseText);

      // Validate with Zod schema
      const validated = AIAnalysisOutputSchema.parse(parsed);

      console.log(`✅ [OpenAI] Analyzed script: ${validated.scenes.length} scenes generated`);

      return validated;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ [OpenAI] Analysis failed:', error);
      throw new Error(`OpenAI analysis failed: ${errorMessage}`);
    }
  }
}

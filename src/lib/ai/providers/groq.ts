import Groq from 'groq-sdk';
import { AIProvider, AIAnalysisOutput, AIAnalysisOutputSchema } from '../types';
import { SCRIPT_ANALYZER_SYSTEM_PROMPT, SCRIPT_ANALYZER_USER_PROMPT } from '../prompts/script-analyzer';

export class GroqProvider implements AIProvider {
  private client: Groq;

  constructor(apiKey: string) {
    this.client = new Groq({
      apiKey: apiKey,
    });
  }

  async analyzeScript(rawScript: string): Promise<AIAnalysisOutput> {
    try {
      const response = await this.client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
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
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in Groq response');
      }

      // Parse JSON
      const parsed = JSON.parse(content);

      // Validate with Zod schema
      const validated = AIAnalysisOutputSchema.parse(parsed);

      console.log(`✅ [Groq] Analyzed script: ${validated.scenes.length} scenes generated`);

      return validated;
    } catch (error) {
      console.error('❌ [Groq] Analysis failed:', error);
      throw new Error(`Groq analysis failed: ${error.message}`);
    }
  }
}

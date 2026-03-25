import Groq from 'groq-sdk';
import { AIProvider, AIAnalysisOutput, AIAnalysisOutputSchema } from '../types';
import { SCRIPT_ANALYZER_SYSTEM_PROMPT, SCRIPT_ANALYZER_USER_PROMPT } from '../prompts/script-analyzer';
import { segmentScript } from '../script-segmenter';

export class GroqProvider implements AIProvider {
  private client: Groq;

  constructor(apiKey: string) {
    this.client = new Groq({
      apiKey: apiKey,
      timeout: 60000, // 60 second timeout for API requests
    });
  }

  async analyzeScript(rawScript: string): Promise<AIAnalysisOutput> {
    // Segment the script into sentences with narrative context
    const segmentedScript = segmentScript(rawScript);

    // Delegate to analyzeScriptWithContext using default prompts
    const systemPrompt = SCRIPT_ANALYZER_SYSTEM_PROMPT();
    const userPrompt = SCRIPT_ANALYZER_USER_PROMPT(segmentedScript);
    return this.analyzeScriptWithContext(systemPrompt, userPrompt);
  }

  async analyzeScriptWithContext(
    systemPrompt: string,
    userPrompt: string
  ): Promise<AIAnalysisOutput> {
    try {
      const response = await this.client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ [Groq] Analysis failed:', error);
      throw new Error(`Groq analysis failed: ${errorMessage}`);
    }
  }
}

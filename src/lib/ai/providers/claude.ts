import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, AIAnalysisOutput, AIAnalysisOutputSchema } from '../types';
import { SCRIPT_ANALYZER_SYSTEM_PROMPT, SCRIPT_ANALYZER_USER_PROMPT } from '../prompts/script-analyzer';

export class ClaudeProvider implements AIProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({
      apiKey: apiKey,
    });
  }

  async analyzeScript(rawScript: string): Promise<AIAnalysisOutput> {
    try {
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        temperature: 0.7,
        system: SCRIPT_ANALYZER_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: SCRIPT_ANALYZER_USER_PROMPT(rawScript),
          },
        ],
      });

      // Extract JSON from response
      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      // Parse JSON (Claude might wrap it in markdown code blocks)
      let jsonText = content.text.trim();

      // Remove markdown code blocks if present
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\s*/, '').replace(/```\s*$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\s*/, '').replace(/```\s*$/, '');
      }

      const parsed = JSON.parse(jsonText);

      // Validate with Zod schema
      const validated = AIAnalysisOutputSchema.parse(parsed);

      console.log(`✅ [Claude] Analyzed script: ${validated.scenes.length} scenes generated`);

      return validated;
    } catch (error) {
      console.error('❌ [Claude] Analysis failed:', error);
      throw new Error(`Claude analysis failed: ${error.message}`);
    }
  }
}

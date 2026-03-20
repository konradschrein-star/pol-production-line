import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIProvider, AIAnalysisOutput, AIAnalysisOutputSchema } from '../types';
import { SCRIPT_ANALYZER_SYSTEM_PROMPT, SCRIPT_ANALYZER_USER_PROMPT } from '../prompts/script-analyzer';

export class GoogleProvider implements AIProvider {
  private client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async analyzeScript(rawScript: string): Promise<AIAnalysisOutput> {
    try {
      const model = this.client.getGenerativeModel({
        model: 'gemini-pro',
        generationConfig: {
          temperature: 0.7,
        },
      });

      const prompt = `${SCRIPT_ANALYZER_SYSTEM_PROMPT}\n\n${SCRIPT_ANALYZER_USER_PROMPT(rawScript)}`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : text;

      // Parse JSON
      const parsed = JSON.parse(jsonText.trim());

      // Validate with Zod schema
      const validated = AIAnalysisOutputSchema.parse(parsed);

      console.log(`✅ [Google] Analyzed script: ${validated.scenes.length} scenes generated`);

      return validated;
    } catch (error) {
      console.error('❌ [Google] Analysis failed:', error);
      throw new Error(`Google analysis failed: ${error.message}`);
    }
  }
}

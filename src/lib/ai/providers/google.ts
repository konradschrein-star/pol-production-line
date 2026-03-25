import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIProvider, AIAnalysisOutput, AIAnalysisOutputSchema } from '../types';
import { SCRIPT_ANALYZER_SYSTEM_PROMPT, SCRIPT_ANALYZER_USER_PROMPT } from '../prompts/script-analyzer';
import { segmentScript } from '../script-segmenter';

export class GoogleProvider implements AIProvider {
  private client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
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
      const model = this.client.getGenerativeModel({
        model: 'gemini-2.5-flash', // Updated to latest model
        generationConfig: {
          temperature: 0.7,
          // Note: responseMimeType not supported in all Gemini versions
          // Relying on prompt instructions for JSON output instead
        },
      });

      // Google requires combining system and user prompts
      const prompt = `${systemPrompt}\n\n${userPrompt}`;

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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ [Google] Analysis failed:', error);
      throw new Error(`Google analysis failed: ${errorMessage}`);
    }
  }
}

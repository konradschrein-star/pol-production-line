import Groq from 'groq-sdk';
import {
  AIProvider,
  AIAnalysisOutput,
  AIAnalysisOutputSchema,
  SceneBasedAnalysisOutput,
  SceneBasedAnalysisOutputSchema,
} from '../types';
import { SCRIPT_ANALYZER_SYSTEM_PROMPT, SCRIPT_ANALYZER_USER_PROMPT } from '../prompts/script-analyzer';
import { SCENE_BASED_SYSTEM_PROMPT, SCENE_BASED_USER_PROMPT } from '../prompts/scene-based-analyzer';
import { segmentScript } from '../script-segmenter';
import { segmentIntoScenes, flattenScenePrompts } from '../scene-segmenter';

export class GroqProvider implements AIProvider {
  private client: Groq;

  constructor(apiKey: string) {
    this.client = new Groq({
      apiKey: apiKey,
      timeout: 120000, // 120 second timeout (increased for scene-based mode with detailed prompts)
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

  /**
   * NEW: Scene-based analysis (Phase 2)
   *
   * Groups sentences into scenes, generates N prompts per scene with shared visual theme,
   * then flattens back to sentence-level format for database/rendering.
   *
   * @param rawScript - Raw news script text
   * @param avatarDurationSeconds - Avatar video duration (for hook boundary calculation)
   * @param styleContext - Optional style preset context
   * @returns Flattened sentence-level analysis output
   */
  async analyzeScriptSceneBasedWithDuration(
    rawScript: string,
    avatarDurationSeconds: number,
    styleContext?: any
  ): Promise<AIAnalysisOutput> {
    console.log(`\n🎬 [Groq Scene-Based] Starting scene-based analysis...`);
    console.log(`   Script length: ${rawScript.length} chars`);
    console.log(`   Avatar duration: ${avatarDurationSeconds}s`);

    // Step 1: Segment script into sentences
    const segmentedSentences = segmentScript(rawScript);
    console.log(`   Segmented into ${segmentedSentences.length} sentences`);

    // Step 2: Group sentences into broad scenes
    const broadScenes = segmentIntoScenes(segmentedSentences, avatarDurationSeconds);
    console.log(`   Grouped into ${broadScenes.length} broad scenes`);

    // Step 3: Generate prompts for each scene
    const scenePrompts: any[] = [];

    for (let i = 0; i < broadScenes.length; i++) {
      const scene = broadScenes[i];
      console.log(`   Generating prompts for scene ${scene.id} (${scene.sentences.length} sentences)...`);

      const systemPrompt = SCENE_BASED_SYSTEM_PROMPT(styleContext);
      const userPrompt = SCENE_BASED_USER_PROMPT(scene);

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
          throw new Error(`No content in Groq response for scene ${scene.id}`);
        }

        const parsed = JSON.parse(content);
        scenePrompts.push(parsed);

        console.log(`   ✅ Scene ${scene.id}: ${parsed.sentence_prompts?.length || 0} prompts generated`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`   ❌ Scene ${scene.id} failed:`, errorMessage);
        throw new Error(`Scene ${scene.id} analysis failed: ${errorMessage}`);
      }
    }

    // Step 4: Flatten scene-based output to sentence-level format
    const flattenedPrompts = flattenScenePrompts(broadScenes, scenePrompts);

    console.log(`   Flattened to ${flattenedPrompts.length} sentence-level prompts`);

    // Step 5: Convert to legacy AIAnalysisOutput format
    const scenes = flattenedPrompts.map((prompt, idx) => ({
      id: idx,
      sentence_text: prompt.sentenceText,
      image_prompt: prompt.imagePrompt,
      shot_type: prompt.shotType as 'establishing' | 'medium' | 'closeup' | 'detail',
      ticker_headline: prompt.tickerHeadline,
      narrative_position: prompt.narrativePosition as 'opening' | 'development' | 'evidence' | 'conclusion',
      visual_continuity_notes: prompt.visualContinuityNotes,
      image_url: null,
      scene_context: undefined,
    }));

    const result: AIAnalysisOutput = { scenes };

    console.log(`✅ [Groq Scene-Based] Complete: ${result.scenes.length} total scenes`);

    return result;
  }

  /**
   * Scene-based analysis with custom prompts (implements AIProvider interface)
   */
  async analyzeScriptSceneBased(
    systemPrompt: string,
    userPrompt: string
  ): Promise<SceneBasedAnalysisOutput> {
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

      const parsed = JSON.parse(content);
      const validated = SceneBasedAnalysisOutputSchema.parse(parsed);

      console.log(`✅ [Groq Scene-Based] Generated ${validated.scenes.length} scene(s)`);

      return validated;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ [Groq Scene-Based] Analysis failed:', error);
      throw new Error(`Groq scene-based analysis failed: ${errorMessage}`);
    }
  }
}

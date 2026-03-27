import Anthropic from '@anthropic-ai/sdk';
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

export class ClaudeProvider implements AIProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({
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
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        temperature: 0.7,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ [Claude] Analysis failed:', error);
      throw new Error(`Claude analysis failed: ${errorMessage}`);
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
    console.log(`\n🎬 [Claude Scene-Based] Starting scene-based analysis...`);
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
        const response = await this.client.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 4096,
          temperature: 0.7,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: userPrompt,
            },
          ],
        });

        // Extract JSON from response
        const content = response.content[0];
        if (content.type !== 'text') {
          throw new Error(`Unexpected response type from Claude for scene ${scene.id}`);
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

        // ✅ VALIDATE PROMPT COUNT BEFORE ACCEPTING
        const expectedCount = scene.subSentences ? scene.subSentences.length : scene.sentences.length;
        const actualCount = parsed.sentence_prompts?.length || 0;

        if (actualCount !== expectedCount) {
          throw new Error(
            `AI returned ${actualCount} prompts but expected ${expectedCount} for scene ${scene.id} ` +
            `(${scene.isHook ? 'hook' : 'body'}). This scene has ${expectedCount} sentences/sub-sentences ` +
            `that need visualization. AI must generate exactly one prompt per sentence.`
          );
        }

        scenePrompts.push(parsed);

        console.log(`   ✅ Scene ${scene.id}: ${actualCount}/${expectedCount} prompts generated (validated)`);
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

    console.log(`✅ [Claude Scene-Based] Complete: ${result.scenes.length} total scenes`);

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
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        temperature: 0.7,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
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
      const validated = SceneBasedAnalysisOutputSchema.parse(parsed);

      console.log(`✅ [Claude Scene-Based] Generated ${validated.scenes.length} scene(s)`);

      return validated;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ [Claude Scene-Based] Analysis failed:', error);
      throw new Error(`Claude scene-based analysis failed: ${errorMessage}`);
    }
  }
}

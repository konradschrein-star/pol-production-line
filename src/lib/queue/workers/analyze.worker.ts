import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { redisOptions } from '../index';
import { queueImages } from '../queues';
import { db } from '../../db';
import { createAIProvider, ProviderType } from '../../ai';
import { stylePresetManager } from '../../style-presets/manager';
import { SCRIPT_ANALYZER_SYSTEM_PROMPT, SCRIPT_ANALYZER_USER_PROMPT } from '../../ai/prompts/script-analyzer';
import { segmentScript } from '../../ai/script-segmenter';

interface AnalyzeJobData {
  jobId: string;
  rawScript: string;
  provider?: ProviderType;
}

export const analyzeWorker = new Worker<AnalyzeJobData>(
  'queue_analyze',
  async (job: Job<AnalyzeJobData>) => {
    const { jobId, rawScript, provider: providerType } = job.data;

    console.log(`\n🔍 [ANALYZE] Starting analysis for job ${jobId}`);
    console.log(`📝 Script length: ${rawScript.length} characters`);
    console.log(`🤖 AI Provider: ${providerType || 'default (from env)'}`);

    // Start timing for metrics
    const analysisStartTime = Date.now();

    try {
      // 1. Segment the script into sentences with narrative context
      console.log(`📄 [ANALYZE] Segmenting script into sentences...`);
      const segmentedScript = segmentScript(rawScript);
      console.log(`✅ [ANALYZE] Script segmented: ${segmentedScript.length} sentences`);
      segmentedScript.slice(0, 3).forEach((s, i) => {
        console.log(`   - Sentence ${i}: "${s.text.substring(0, 50)}..." [${s.narrativePosition}]`);
      });

      // 2. Fetch style preset if job has one
      let styleContext: any = undefined;
      let stylePresetName = '';

      const jobStyleResult = await db.query(
        'SELECT style_preset_id FROM news_jobs WHERE id = $1',
        [jobId]
      );

      if (jobStyleResult.rows[0]?.style_preset_id) {
        const presetId = jobStyleResult.rows[0].style_preset_id;
        console.log(`📐 [ANALYZE] Job uses style preset: ${presetId}`);

        try {
          // Build rich context from style preset
          const styleContextStr = await stylePresetManager.buildStyleContext(presetId);
          const preset = await stylePresetManager.getById(presetId);
          stylePresetName = preset?.name || '';

          // Parse style context into structured format for prompt
          styleContext = {
            visualStyle: styleContextStr,
          };

          console.log(`✅ [ANALYZE] Style context loaded (${styleContextStr.length} chars)`);
        } catch (error) {
          console.warn(`⚠️ [ANALYZE] Failed to load style context:`, error);
          // Continue without style context
        }
      }

      // 3. Update job status to analyzing
      await db.query(
        'UPDATE news_jobs SET status = $1 WHERE id = $2',
        ['analyzing', jobId]
      );

      // 4. Call AI provider with segmented script and style-enhanced prompts
      const provider = createAIProvider(providerType);

      // Create enhanced prompts with segmented script and style context
      const systemPrompt = SCRIPT_ANALYZER_SYSTEM_PROMPT(styleContext);
      const userPrompt = SCRIPT_ANALYZER_USER_PROMPT(segmentedScript, stylePresetName || undefined);

      // Call provider with enhanced prompts
      const analysis = await provider.analyzeScriptWithContext(systemPrompt, userPrompt);

      // Record analysis timing
      const analysisTimeMs = Date.now() - analysisStartTime;

      console.log(`✅ [ANALYZE] AI analysis complete:`);
      console.log(`   - Scenes generated: ${analysis.scenes.length}`);

      // Insert scenes into news_scenes using bulk INSERT ... RETURNING
      // Now includes sentence_text, narrative_position, shot_type, visual_continuity_notes
      const sceneValues = analysis.scenes.map((scene, idx) =>
        `($1, $${idx * 9 + 2}, $${idx * 9 + 3}, $${idx * 9 + 4}, $${idx * 9 + 5}, $${idx * 9 + 6}, $${idx * 9 + 7}, $${idx * 9 + 8}, $${idx * 9 + 9}, $${idx * 9 + 10})`
      ).join(', ');

      const flatValues: any[] = [jobId];
      analysis.scenes.forEach(scene => {
        flatValues.push(
          scene.id,                                                         // scene_order
          scene.image_prompt,                                               // image_prompt
          scene.ticker_headline,                                            // ticker_headline
          'pending',                                                        // generation_status
          scene.sentence_text || '',                                        // sentence_text (NEW)
          scene.narrative_position || 'development',                        // narrative_position (NEW)
          scene.shot_type || 'medium',                                      // shot_type (NEW)
          scene.visual_continuity_notes || null,                            // visual_continuity_notes (NEW)
          scene.scene_context ? JSON.stringify(scene.scene_context) : null  // scene_context (deprecated)
        );
      });

      const sceneResult = await db.query(
        `INSERT INTO news_scenes
         (job_id, scene_order, image_prompt, ticker_headline, generation_status,
          sentence_text, narrative_position, shot_type, visual_continuity_notes, scene_context)
         VALUES ${sceneValues}
         RETURNING id, image_prompt`,
        flatValues
      );

      console.log(`💾 [ANALYZE] Stored ${sceneResult.rows.length} scenes in database (bulk insert)`);

      // Create job_metrics record with analysis timing
      await db.query(
        `INSERT INTO job_metrics (job_id, analysis_time_ms, scene_count)
         VALUES ($1, $2, $3)
         ON CONFLICT (job_id) DO UPDATE
         SET analysis_time_ms = EXCLUDED.analysis_time_ms,
             scene_count = EXCLUDED.scene_count`,
        [jobId, analysisTimeMs, analysis.scenes.length]
      );

      console.log(`📊 [ANALYZE] Metrics recorded: ${analysisTimeMs}ms for ${analysis.scenes.length} scenes`);

      // Update job status to generating_images AND save avatar_script
      await db.query(
        'UPDATE news_jobs SET status = $1, avatar_script = $2 WHERE id = $3',
        ['generating_images', rawScript, jobId]
      );

      // Queue all scenes to queue_images (using RETURNING data directly, no re-query needed)
      for (const scene of sceneResult.rows) {
        await queueImages.add('generate-image', {
          sceneId: scene.id,
          imagePrompt: scene.image_prompt,
          jobId: jobId,
        });
      }

      console.log(`📨 [ANALYZE] Queued ${sceneResult.rows.length} scenes to queue_images`);
      console.log(`✅ [ANALYZE] Job ${jobId} analysis complete\n`);

      return {
        success: true,
        scenesGenerated: analysis.scenes.length,
      };
    } catch (error) {
      console.error(`❌ [ANALYZE] Job ${jobId} failed:`, error);

      // Update job status to failed
      await db.query(
        'UPDATE news_jobs SET status = $1, error_message = $2 WHERE id = $3',
        ['failed', error instanceof Error ? error.message : String(error), jobId]
      );

      throw error;
    }
  },
  {
    connection: redisOptions,
    concurrency: 2, // Can process 2 analysis jobs in parallel
  }
);

analyzeWorker.on('completed', (job) => {
  console.log(`✅ [ANALYZE] Worker completed job ${job.id}`);
});

analyzeWorker.on('failed', (job, err) => {
  console.error(`❌ [ANALYZE] Worker failed job ${job?.id}:`, err);
});

export default analyzeWorker;

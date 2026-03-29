import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { redisOptions } from '../index';
import { queueImages } from '../queues';
import { db } from '../../db';
import { withTransaction, transitionJobState } from '../../db/transactions';
import { createAIProvider, ProviderType } from '../../ai';
import { stylePresetManager } from '../../style-presets/manager';
import { SCRIPT_ANALYZER_SYSTEM_PROMPT, SCRIPT_ANALYZER_USER_PROMPT } from '../../ai/prompts/script-analyzer';
import { segmentScript } from '../../ai/script-segmenter';

interface AnalyzeJobData {
  jobId: string;
  rawScript: string;
  provider?: ProviderType;
  avatarDurationSeconds?: number; // NEW: Optional avatar duration for scene-based analysis
  useSceneBased?: boolean;        // NEW: Flag to enable scene-based analysis
}

/**
 * Estimates avatar duration based on script length
 * Average speaking rate: 150 words/minute = 2.5 words/second
 */
function estimateAvatarDuration(script: string): number {
  const words = script.split(/\s+/).filter(w => w.length > 0);
  const estimatedSeconds = words.length / 2.5;
  return Math.max(30, estimatedSeconds); // Minimum 30 seconds
}

export const analyzeWorker = new Worker<AnalyzeJobData>(
  'queue_analyze',
  async (job: Job<AnalyzeJobData>) => {
    const {
      jobId,
      rawScript,
      provider: providerType,
      avatarDurationSeconds,
      useSceneBased = process.env.SCENE_BASED_ANALYSIS === 'true', // Default from env
    } = job.data;

    console.log(`\n🔍 [ANALYZE] Starting analysis for job ${jobId}`);
    console.log(`📝 Script length: ${rawScript.length} characters`);
    console.log(`🤖 AI Provider: ${providerType || 'default (from env)'}`);
    console.log(`🎬 Scene-based mode: ${useSceneBased ? 'ENABLED' : 'DISABLED'}`);

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

      // 3. Update job status to analyzing (no transaction needed, initial state)
      await db.query(
        'UPDATE news_jobs SET status = $1 WHERE id = $2',
        ['analyzing', jobId]
      );

      // 4. Call AI provider with segmented script and style-enhanced prompts
      const provider = createAIProvider(providerType);
      let analysis;

      if (useSceneBased && 'analyzeScriptSceneBasedWithDuration' in provider) {
        // NEW: Scene-based analysis (Phase 2)
        console.log(`🎬 [ANALYZE] Using scene-based analysis...`);

        // Determine avatar duration (provided or estimated)
        const duration = avatarDurationSeconds || estimateAvatarDuration(rawScript);
        console.log(`   Estimated/provided avatar duration: ${duration.toFixed(1)}s`);

        // Call scene-based analysis
        analysis = await (provider as any).analyzeScriptSceneBasedWithDuration(
          rawScript,
          duration,
          styleContext
        );
      } else {
        // LEGACY: Flat sentence-based analysis
        console.log(`📄 [ANALYZE] Using legacy sentence-based analysis...`);

        const systemPrompt = SCRIPT_ANALYZER_SYSTEM_PROMPT(styleContext);
        const userPrompt = SCRIPT_ANALYZER_USER_PROMPT(segmentedScript, stylePresetName || undefined);

        analysis = await provider.analyzeScriptWithContext(systemPrompt, userPrompt);
      }

      // Record analysis timing
      const analysisTimeMs = Date.now() - analysisStartTime;

      console.log(`✅ [ANALYZE] AI analysis complete:`);
      console.log(`   - Scenes generated: ${analysis.scenes.length}`);

      // PRODUCTION HARDENING: Wrap database updates in transaction to prevent race conditions
      // This ensures scenes are inserted AND status is updated atomically
      const sceneResult = await withTransaction(async (client) => {
        // Insert scenes into news_scenes using bulk INSERT ... RETURNING
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

        const result = await client.query(
          `INSERT INTO news_scenes
           (job_id, scene_order, image_prompt, ticker_headline, generation_status,
            sentence_text, narrative_position, shot_type, visual_continuity_notes, scene_context)
           VALUES ${sceneValues}
           RETURNING id, image_prompt`,
          flatValues
        );

        console.log(`💾 [ANALYZE] Stored ${result.rows.length} scenes in database (bulk insert)`);

        // Create job_metrics record with analysis timing
        await client.query(
          `INSERT INTO job_metrics (job_id, analysis_time_ms, scene_count)
           VALUES ($1, $2, $3)
           ON CONFLICT (job_id) DO UPDATE
           SET analysis_time_ms = EXCLUDED.analysis_time_ms,
               scene_count = EXCLUDED.scene_count`,
          [jobId, analysisTimeMs, analysis.scenes.length]
        );

        console.log(`📊 [ANALYZE] Metrics recorded: ${analysisTimeMs}ms for ${analysis.scenes.length} scenes`);

        // Transition job state with advisory lock to prevent race conditions
        const transitioned = await transitionJobState(client, jobId, 'analyzing', 'generating_images');

        if (!transitioned) {
          throw new Error('Failed to transition job state (another worker may have already transitioned it)');
        }

        // Save avatar_script
        await client.query(
          'UPDATE news_jobs SET avatar_script = $1 WHERE id = $2',
          [rawScript, jobId]
        );

        return result;
      });

      // PROACTIVE TOKEN VALIDATION: Check token before queueing images
      console.log('🔍 [ANALYZE] Validating Whisk token before image generation...');

      const { validateWhiskToken } = await import('../../whisk/token-validation');
      const { triggerExtensionRefresh } = await import('../../whisk/extension-integration');

      const tokenValid = await validateWhiskToken();

      if (!tokenValid) {
        console.warn('⚠️ [ANALYZE] Token invalid, triggering extension refresh...');

        try {
          const refreshResult = await triggerExtensionRefresh(30000); // 30 second timeout

          if (!refreshResult.success) {
            throw new Error(`Token refresh failed: ${refreshResult.error || 'Unknown error'}`);
          }

          // Re-validate after refresh
          await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s for token to update
          const revalidated = await validateWhiskToken();

          if (!revalidated) {
            throw new Error('Token still invalid after refresh');
          }

          console.log('✅ [ANALYZE] Token refreshed successfully');

        } catch (error) {
          // Token refresh failed - mark job as failed and create notification
          console.error('❌ [ANALYZE] Token refresh failed:', error);

          await db.query(
            'UPDATE news_jobs SET status = $1, error_message = $2 WHERE id = $3',
            ['failed', `Token validation failed: ${error instanceof Error ? error.message : String(error)}`, jobId]
          );

          // Create notification
          const { createNotification } = await import('../../notifications');
          await createNotification({
            job_id: jobId,
            severity: 'error',
            category: 'token_refresh',
            message: 'Whisk token expired and automatic refresh failed. Manual intervention required.',
            details: {
              error: error instanceof Error ? error.message : String(error),
              suggestion: 'Open Whisk in browser (F12 → Network → Generate image → Copy new Bearer token → Update .env)'
            }
          });

          throw error; // Fail the job
        }
      } else {
        console.log('✅ [ANALYZE] Token is valid, proceeding with image generation');
      }

      // Queue all scenes to queue_images (OUTSIDE transaction for performance)
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

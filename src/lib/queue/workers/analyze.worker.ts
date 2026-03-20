import { Worker, Job } from 'bullmq';
import { redisOptions } from '../index';
import { queueImages } from '../queues';
import { db } from '../../db';
import { createAIProvider, ProviderType } from '../../ai';

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

    try {
      // Update job status to analyzing
      await db.query(
        'UPDATE news_jobs SET status = $1 WHERE id = $2',
        ['analyzing', jobId]
      );

      // Call AI provider with specified type
      const provider = createAIProvider(providerType);
      const analysis = await provider.analyzeScript(rawScript);

      console.log(`✅ [ANALYZE] AI analysis complete:`);
      console.log(`   - Scenes generated: ${analysis.scenes.length}`);

      // Insert scenes into news_scenes
      for (const scene of analysis.scenes) {
        await db.query(
          `INSERT INTO news_scenes
           (job_id, scene_order, image_prompt, ticker_headline, image_url, generation_status)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            jobId,
            scene.id,
            scene.image_prompt,
            scene.ticker_headline,
            null, // image_url starts as null
            'pending',
          ]
        );
      }

      console.log(`💾 [ANALYZE] Stored ${analysis.scenes.length} scenes in database`);

      // Update job status to generating_images
      await db.query(
        'UPDATE news_jobs SET status = $1 WHERE id = $2',
        ['generating_images', jobId]
      );

      // Queue all scenes to queue_images
      const sceneResult = await db.query(
        'SELECT id, image_prompt FROM news_scenes WHERE job_id = $1 ORDER BY scene_order',
        [jobId]
      );

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

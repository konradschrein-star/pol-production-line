/**
 * Metrics Manager
 *
 * Centralized service for recording production performance metrics.
 * Tracks job-level and scene-level performance data for analytics.
 *
 * MODULAR DESIGN: Reusable across all content formats (news, podcasts, shorts, etc.)
 *
 * @module metrics-manager
 */

import { db } from '../db';

/**
 * Job-level metrics (end-to-end pipeline performance)
 */
export interface JobMetrics {
  jobId: string;
  analysisTimeMs?: number;
  totalImageGenTimeMs?: number;
  avatarGenTimeMs?: number;
  renderTimeMs?: number;
  totalProcessingTimeMs?: number;
  sceneCount?: number;
  videoLengthSeconds?: number;
  fileSize?: number; // in bytes
  aiProvider?: string;
}

/**
 * Scene-level image generation attempt (for retry tracking)
 */
export interface GenerationAttempt {
  sceneId: string;
  jobId: string;
  attemptNumber: number;
  imageUrl?: string;
  generationParams?: {
    prompt?: string;
    aspectRatio?: string;
    model?: string;
    hadReferences?: boolean;
    referenceTypes?: string[];
  };
  whiskRequestId?: string;
  generationTimeMs?: number;
  success: boolean;
  errorMessage?: string;
}

/**
 * Metrics Manager
 *
 * Provides clean API for recording performance metrics.
 */
export class MetricsManager {

  /**
   * Record or update job-level metrics
   *
   * @param metrics - Partial job metrics (only changed fields)
   */
  async recordJobMetrics(metrics: JobMetrics): Promise<void> {
    try {
      const {
        jobId,
        analysisTimeMs,
        totalImageGenTimeMs,
        avatarGenTimeMs,
        renderTimeMs,
        totalProcessingTimeMs,
        sceneCount,
        videoLengthSeconds,
        fileSize,
        aiProvider,
      } = metrics;

      // Upsert: insert if not exists, update if exists
      await db.query(
        `INSERT INTO job_metrics (
          job_id, analysis_time_ms, total_image_gen_time_ms, avatar_gen_time_ms,
          render_time_ms, total_processing_time_ms, scene_count, video_length_seconds,
          file_size, ai_provider, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        ON CONFLICT (job_id) DO UPDATE SET
          analysis_time_ms = COALESCE($2, job_metrics.analysis_time_ms),
          total_image_gen_time_ms = COALESCE($3, job_metrics.total_image_gen_time_ms),
          avatar_gen_time_ms = COALESCE($4, job_metrics.avatar_gen_time_ms),
          render_time_ms = COALESCE($5, job_metrics.render_time_ms),
          total_processing_time_ms = COALESCE($6, job_metrics.total_processing_time_ms),
          scene_count = COALESCE($7, job_metrics.scene_count),
          video_length_seconds = COALESCE($8, job_metrics.video_length_seconds),
          file_size = COALESCE($9, job_metrics.file_size),
          ai_provider = COALESCE($10, job_metrics.ai_provider),
          updated_at = NOW()`,
        [
          jobId,
          analysisTimeMs,
          totalImageGenTimeMs,
          avatarGenTimeMs,
          renderTimeMs,
          totalProcessingTimeMs,
          sceneCount,
          videoLengthSeconds,
          fileSize,
          aiProvider,
        ]
      );

      console.log(`📊 [Metrics] Recorded job metrics for ${jobId}`);
    } catch (error) {
      console.error('❌ [Metrics] Failed to record job metrics:', error);
      // Don't throw - metrics shouldn't break the pipeline
    }
  }

  /**
   * Record image generation attempt (for retry tracking & success rate)
   *
   * @param attempt - Generation attempt data
   */
  async recordGenerationAttempt(attempt: GenerationAttempt): Promise<void> {
    try {
      const {
        sceneId,
        jobId,
        attemptNumber,
        imageUrl,
        generationParams,
        whiskRequestId,
        generationTimeMs,
        success,
        errorMessage,
      } = attempt;

      await db.query(
        `INSERT INTO generation_history (
          scene_id, job_id, attempt_number, image_url, generation_params,
          whisk_request_id, generation_time_ms, success, error_message,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [
          sceneId,
          jobId,
          attemptNumber,
          imageUrl || null,
          generationParams ? JSON.stringify(generationParams) : null,
          whiskRequestId || null,
          generationTimeMs || null,
          success,
          errorMessage || null,
        ]
      );

      console.log(`📊 [Metrics] Recorded generation attempt #${attemptNumber} for scene ${sceneId.substring(0, 8)}... (success: ${success})`);
    } catch (error) {
      console.error('❌ [Metrics] Failed to record generation attempt:', error);
      // Don't throw - metrics shouldn't break the pipeline
    }
  }

  /**
   * Calculate total image generation time for a job
   *
   * @param jobId - Job UUID
   * @returns Total generation time in milliseconds
   */
  async calculateTotalImageGenTime(jobId: string): Promise<number> {
    try {
      const result = await db.query(
        `SELECT SUM(generation_time_ms) as total
         FROM generation_history
         WHERE job_id = $1 AND success = true`,
        [jobId]
      );

      return parseInt(result.rows[0]?.total || 0);
    } catch (error) {
      console.error('❌ [Metrics] Failed to calculate total image gen time:', error);
      return 0;
    }
  }

  /**
   * Record analysis phase completion
   *
   * @param jobId - Job UUID
   * @param timeMs - Analysis time in milliseconds
   * @param provider - AI provider used (openai, claude, google, groq)
   */
  async recordAnalysisComplete(jobId: string, timeMs: number, provider: string): Promise<void> {
    await this.recordJobMetrics({
      jobId,
      analysisTimeMs: timeMs,
      aiProvider: provider,
    });
  }

  /**
   * Record render phase completion
   *
   * @param jobId - Job UUID
   * @param timeMs - Render time in milliseconds
   * @param videoLengthSeconds - Final video duration
   * @param fileSize - Final video file size in bytes
   */
  async recordRenderComplete(
    jobId: string,
    timeMs: number,
    videoLengthSeconds: number,
    fileSize: number
  ): Promise<void> {
    await this.recordJobMetrics({
      jobId,
      renderTimeMs: timeMs,
      videoLengthSeconds,
      fileSize,
    });
  }

  /**
   * Record avatar generation completion (automated mode only)
   *
   * @param jobId - Job UUID
   * @param timeMs - Avatar generation time in milliseconds
   */
  async recordAvatarComplete(jobId: string, timeMs: number): Promise<void> {
    await this.recordJobMetrics({
      jobId,
      avatarGenTimeMs: timeMs,
    });
  }

  /**
   * Finalize job metrics (calculate total processing time)
   *
   * @param jobId - Job UUID
   */
  async finalizeJobMetrics(jobId: string): Promise<void> {
    try {
      // Get job creation and completion timestamps
      const jobResult = await db.query(
        `SELECT created_at, completed_at FROM news_jobs WHERE id = $1`,
        [jobId]
      );

      if (jobResult.rows.length === 0) {
        console.warn(`⚠️  [Metrics] Job ${jobId} not found`);
        return;
      }

      const createdAt = new Date(jobResult.rows[0].created_at);
      const completedAt = jobResult.rows[0].completed_at
        ? new Date(jobResult.rows[0].completed_at)
        : new Date(); // Use current time if not set

      const totalProcessingTimeMs = completedAt.getTime() - createdAt.getTime();

      // Get scene count
      const sceneCountResult = await db.query(
        `SELECT COUNT(*) as count FROM news_scenes WHERE job_id = $1`,
        [jobId]
      );
      const sceneCount = parseInt(sceneCountResult.rows[0]?.count || 0);

      // Update metrics with total time and scene count
      await this.recordJobMetrics({
        jobId,
        totalProcessingTimeMs,
        sceneCount,
      });

      console.log(`📊 [Metrics] Finalized metrics for ${jobId}: ${(totalProcessingTimeMs / 1000).toFixed(1)}s total, ${sceneCount} scenes`);
    } catch (error) {
      console.error('❌ [Metrics] Failed to finalize job metrics:', error);
    }
  }

  /**
   * Get metrics for a specific job
   *
   * @param jobId - Job UUID
   * @returns Job metrics or null if not found
   */
  async getJobMetrics(jobId: string): Promise<JobMetrics | null> {
    try {
      const result = await db.query(
        `SELECT * FROM job_metrics WHERE job_id = $1`,
        [jobId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        jobId: row.job_id,
        analysisTimeMs: row.analysis_time_ms,
        totalImageGenTimeMs: row.total_image_gen_time_ms,
        avatarGenTimeMs: row.avatar_gen_time_ms,
        renderTimeMs: row.render_time_ms,
        totalProcessingTimeMs: row.total_processing_time_ms,
        sceneCount: row.scene_count,
        videoLengthSeconds: row.video_length_seconds,
        fileSize: row.file_size,
        aiProvider: row.ai_provider,
      };
    } catch (error) {
      console.error('❌ [Metrics] Failed to get job metrics:', error);
      return null;
    }
  }
}

// Singleton instance for global use
export const metricsManager = new MetricsManager();

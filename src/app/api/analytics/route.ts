import { NextResponse } from 'next/server';
import db from '@/lib/db';

/**
 * GET /api/analytics
 * Returns production performance metrics
 */
export async function GET() {
  try {
    // Total jobs
    const totalJobsResult = await db.query('SELECT COUNT(*) FROM news_jobs');
    const totalJobs = parseInt(totalJobsResult.rows[0].count);

    // Completed jobs
    const completedResult = await db.query('SELECT COUNT(*) FROM news_jobs WHERE status = $1', ['completed']);
    const completedJobs = parseInt(completedResult.rows[0].count);

    // Failed jobs
    const failedResult = await db.query('SELECT COUNT(*) FROM news_jobs WHERE status = $1', ['failed']);
    const failedJobs = parseInt(failedResult.rows[0].count);

    // Pending jobs (any non-completed, non-failed status)
    const pendingJobs = totalJobs - completedJobs - failedJobs;

    // Success rate
    const successRate = totalJobs > 0 ? ((completedJobs / totalJobs) * 100).toFixed(1) : '0.0';

    // Average processing time (from job_metrics table for better accuracy)
    const avgTimeMetricsResult = await db.query(`
      SELECT
        AVG(total_processing_time_ms) as avg_total_ms,
        AVG(analysis_time_ms) as avg_analysis_ms,
        AVG(total_image_gen_time_ms) as avg_image_gen_ms,
        AVG(render_time_ms) as avg_render_ms
      FROM job_metrics
      WHERE total_processing_time_ms IS NOT NULL
    `);

    const avgTotalMs = parseFloat(avgTimeMetricsResult.rows[0]?.avg_total_ms || 0);
    const avgAnalysisMs = parseFloat(avgTimeMetricsResult.rows[0]?.avg_analysis_ms || 0);
    const avgImageGenMs = parseFloat(avgTimeMetricsResult.rows[0]?.avg_image_gen_ms || 0);
    const avgRenderMs = parseFloat(avgTimeMetricsResult.rows[0]?.avg_render_ms || 0);

    // Fallback to jobs table if no metrics available
    const avgProcessingTime = avgTotalMs > 0
      ? formatDuration(avgTotalMs / 1000)
      : formatDuration(
          parseFloat(
            (await db.query(`
              SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_seconds
              FROM news_jobs
              WHERE status = 'completed'
            `)).rows[0].avg_seconds || 0
          )
        );

    // Jobs by status
    const jobsByStatusResult = await db.query(`
      SELECT status, COUNT(*) as count
      FROM news_jobs
      GROUP BY status
      ORDER BY count DESC
    `);

    const jobsByStatus = jobsByStatusResult.rows.map(row => ({
      status: row.status,
      count: parseInt(row.count),
    }));

    // Performance breakdown (only if metrics available)
    const performanceBreakdown = avgTotalMs > 0 ? {
      analysis: formatDuration(avgAnalysisMs / 1000),
      imageGeneration: formatDuration(avgImageGenMs / 1000),
      rendering: formatDuration(avgRenderMs / 1000),
      total: formatDuration(avgTotalMs / 1000),
    } : null;

    // Image generation stats
    const imageStatsResult = await db.query(`
      SELECT
        COUNT(*) as total_attempts,
        COUNT(CASE WHEN success = true THEN 1 END) as successful_attempts,
        AVG(CASE WHEN success = true THEN generation_time_ms END) as avg_success_time_ms
      FROM generation_history
    `);

    const imageStats = {
      totalAttempts: parseInt(imageStatsResult.rows[0]?.total_attempts || 0),
      successfulAttempts: parseInt(imageStatsResult.rows[0]?.successful_attempts || 0),
      avgGenerationTime: formatDuration(
        parseFloat(imageStatsResult.rows[0]?.avg_success_time_ms || 0) / 1000
      ),
      successRate: imageStatsResult.rows[0]?.total_attempts > 0
        ? ((imageStatsResult.rows[0].successful_attempts / imageStatsResult.rows[0].total_attempts) * 100).toFixed(1)
        : '0.0',
    };

    return NextResponse.json({
      totalJobs,
      completedJobs,
      failedJobs,
      pendingJobs,
      successRate: parseFloat(successRate),
      avgProcessingTime,
      performanceBreakdown,
      imageGenerationStats: imageStats,
      jobsByStatus,
    });

  } catch (error) {
    console.error('❌ [Analytics] Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

/**
 * Format duration from seconds to human-readable string
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.floor(seconds)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

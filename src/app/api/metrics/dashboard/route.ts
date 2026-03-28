/**
 * Performance Dashboard Metrics API
 *
 * Provides aggregated performance metrics for the analytics dashboard.
 * Data includes job throughput, stage durations, worker health, and error trends.
 *
 * Phase 8: Monitoring & Observability
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const timeRange = searchParams.get('range') || '7d'; // 7 days default

    // Calculate time interval
    const interval =
      timeRange === '24h' ? '24 hours' :
      timeRange === '7d' ? '7 days' :
      timeRange === '30d' ? '30 days' :
      '7 days';

    // Query 1: Job throughput by day
    const throughputQuery = await pool.query(
      `SELECT
        DATE_TRUNC('day', created_at) as date,
        COUNT(*) as job_count,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count
      FROM news_jobs
      WHERE created_at > NOW() - INTERVAL '${interval}'
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date ASC`
    );

    // Query 2: Stage duration averages (from job_metrics table)
    const stageDurationQuery = await pool.query(
      `SELECT
        AVG(analysis_time_ms / 1000.0) as avg_analysis_time_seconds,
        AVG(total_image_gen_time_ms / 1000.0) as avg_image_time_seconds,
        AVG(render_time_ms / 1000.0) as avg_render_time_seconds,
        AVG(total_processing_time_ms / 1000.0) as avg_total_time_seconds,
        COUNT(*) as sample_size
      FROM job_metrics
      WHERE created_at > NOW() - INTERVAL '${interval}'`
    );

    // Query 3: Error breakdown (top 10 error types)
    const errorQuery = await pool.query(
      `SELECT
        COALESCE(error_message, 'Unknown error') as error_type,
        COUNT(*) as count
      FROM news_jobs
      WHERE status = 'failed'
        AND created_at > NOW() - INTERVAL '${interval}'
      GROUP BY error_message
      ORDER BY count DESC
      LIMIT 10`
    );

    // Query 4: Worker health (current queue depth)
    const queueDepthQuery = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'analyzing') as analyzing_count,
        COUNT(*) FILTER (WHERE status = 'generating_images') as generating_images_count,
        COUNT(*) FILTER (WHERE status = 'review_assets') as review_assets_count,
        COUNT(*) FILTER (WHERE status = 'rendering') as rendering_count
      FROM news_jobs`
    );

    // Query 5: Success rate over time
    const successRateQuery = await pool.query(
      `SELECT
        DATE_TRUNC('day', created_at) as date,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        ROUND(
          100.0 * COUNT(*) FILTER (WHERE status = 'completed') / NULLIF(COUNT(*), 0),
          1
        ) as success_rate_percent
      FROM news_jobs
      WHERE created_at > NOW() - INTERVAL '${interval}'
        AND status IN ('completed', 'failed', 'cancelled')
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date ASC`
    );

    // Query 6: Resource usage (database pool stats)
    const poolStats = pool.getPoolStats();

    // Query 7: Average processing times by video duration
    const processingTimesByDurationQuery = await pool.query(
      `SELECT
        CASE
          WHEN final_video_duration_seconds < 30 THEN '0-30s'
          WHEN final_video_duration_seconds < 60 THEN '30-60s'
          WHEN final_video_duration_seconds < 120 THEN '60-120s'
          ELSE '120s+'
        END as duration_bucket,
        COUNT(*) as job_count,
        AVG(total_processing_time_ms / 1000.0) as avg_processing_seconds,
        AVG(render_time_ms / 1000.0) as avg_render_seconds
      FROM job_metrics
      WHERE created_at > NOW() - INTERVAL '${interval}'
        AND final_video_duration_seconds IS NOT NULL
      GROUP BY duration_bucket
      ORDER BY
        CASE duration_bucket
          WHEN '0-30s' THEN 1
          WHEN '30-60s' THEN 2
          WHEN '60-120s' THEN 3
          ELSE 4
        END`
    );

    // Assemble response
    const response = {
      timeRange: interval,
      timestamp: new Date().toISOString(),

      throughput: throughputQuery.rows,

      stageDuration: stageDurationQuery.rows[0] || {
        avg_analysis_time_seconds: null,
        avg_image_time_seconds: null,
        avg_render_time_seconds: null,
        avg_total_time_seconds: null,
        sample_size: 0,
      },

      errors: errorQuery.rows,

      queueHealth: queueDepthQuery.rows[0] || {
        pending_count: 0,
        analyzing_count: 0,
        generating_images_count: 0,
        review_assets_count: 0,
        rendering_count: 0,
      },

      successRate: successRateQuery.rows,

      resourceUsage: {
        databasePool: {
          total: poolStats.total,
          idle: poolStats.idle,
          waiting: poolStats.waiting,
          utilization: Math.round((poolStats.total - poolStats.idle) / poolStats.total * 100),
        },
      },

      processingTimesByDuration: processingTimesByDurationQuery.rows,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ [METRICS API] Error fetching dashboard metrics:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to fetch dashboard metrics',
      },
      { status: 500 }
    );
  }
}

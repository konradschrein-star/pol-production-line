/**
 * POST /api/jobs/:id/seo - Generate YouTube SEO metadata for a completed job
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateYouTubeSEO } from '@/lib/ai/youtube-seo';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = params.id;

    // Fetch job and scenes
    const jobResult = await db.query(
      'SELECT raw_script, status FROM news_jobs WHERE id = $1',
      [jobId]
    );

    if (jobResult.rows.length === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const job = jobResult.rows[0];

    // Check if job is completed
    if (job.status !== 'completed') {
      return NextResponse.json(
        { error: 'Job must be completed before generating SEO metadata' },
        { status: 400 }
      );
    }

    // Fetch scenes for headlines
    const scenesResult = await db.query(
      'SELECT ticker_headline FROM news_scenes WHERE job_id = $1 ORDER BY scene_order',
      [jobId]
    );

    // Generate SEO metadata
    console.log(`🎯 [API] Generating YouTube SEO for job ${jobId}`);
    const metadata = await generateYouTubeSEO(
      job.raw_script,
      scenesResult.rows,
      'google' // Default to Google/Gemini
    );

    // Update database
    await db.query(
      `UPDATE news_jobs
       SET youtube_title = $1,
           youtube_description = $2,
           youtube_tags = $3,
           youtube_keywords = $4,
           youtube_hashtags = $5,
           youtube_category = $6,
           youtube_thumbnail_suggestions = $7,
           seo_generated_at = NOW()
       WHERE id = $8`,
      [
        metadata.title,
        metadata.description,
        JSON.stringify(metadata.tags),
        JSON.stringify(metadata.keywords),
        JSON.stringify(metadata.hashtags),
        metadata.category,
        JSON.stringify(metadata.thumbnail_suggestions),
        jobId,
      ]
    );

    console.log(`✅ [API] SEO metadata saved for job ${jobId}`);

    return NextResponse.json({
      success: true,
      metadata,
    });
  } catch (error) {
    console.error('Failed to generate YouTube SEO:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate SEO metadata',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = params.id;

    const result = await db.query(
      `SELECT youtube_title, youtube_description, youtube_tags,
              youtube_keywords, youtube_hashtags, youtube_category,
              youtube_thumbnail_suggestions, seo_generated_at
       FROM news_jobs WHERE id = $1`,
      [jobId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const row = result.rows[0];

    if (!row.seo_generated_at) {
      return NextResponse.json(
        { error: 'SEO metadata not generated yet' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      title: row.youtube_title,
      description: row.youtube_description,
      tags: row.youtube_tags,
      keywords: row.youtube_keywords,
      hashtags: row.youtube_hashtags,
      category: row.youtube_category,
      thumbnail_suggestions: row.youtube_thumbnail_suggestions,
      generated_at: row.seo_generated_at,
    });
  } catch (error) {
    console.error('Failed to fetch YouTube SEO:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SEO metadata' },
      { status: 500 }
    );
  }
}

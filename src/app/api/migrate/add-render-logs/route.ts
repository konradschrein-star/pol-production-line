import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/migrate/add-render-logs
 * One-time migration to add render_logs column for console output
 */
export async function POST() {
  try {
    console.log('🔧 Running migration: add render_logs column...');

    // Add render_logs JSONB column to store console output
    await db.query(`
      ALTER TABLE news_jobs
      ADD COLUMN IF NOT EXISTS render_logs JSONB DEFAULT '[]'::jsonb
    `);

    // Create GIN index for JSONB queries
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_news_jobs_render_logs
      ON news_jobs USING gin(render_logs)
    `);

    console.log('✅ Migration completed successfully!');

    return NextResponse.json({
      success: true,
      message: 'render_logs column added successfully',
    });
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

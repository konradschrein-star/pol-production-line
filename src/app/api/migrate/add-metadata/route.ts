import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/migrate/add-metadata
 * One-time migration to add job_metadata column
 */
export async function POST() {
  try {
    console.log('🔧 Running migration: add job_metadata column...');

    // Add job_metadata column
    await db.query(`
      ALTER TABLE news_jobs
      ADD COLUMN IF NOT EXISTS job_metadata JSONB DEFAULT NULL
    `);

    // Create GIN index for JSONB queries
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_news_jobs_metadata
      ON news_jobs USING gin(job_metadata)
    `);

    console.log('✅ Migration completed successfully!');

    return NextResponse.json({
      success: true,
      message: 'job_metadata column added successfully',
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

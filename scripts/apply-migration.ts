import 'dotenv/config';
import { db } from '../src/lib/db';

async function runMigration() {
  try {
    console.log('📊 Applying metrics tables migration...');

    // Create job_metrics table
    await db.query(`
      CREATE TABLE IF NOT EXISTS job_metrics (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          job_id UUID NOT NULL REFERENCES news_jobs(id) ON DELETE CASCADE,
          analysis_time_ms INTEGER,
          total_image_gen_time_ms INTEGER,
          avatar_gen_time_ms INTEGER,
          render_time_ms INTEGER,
          total_processing_time_ms INTEGER,
          scene_count INTEGER,
          final_video_size_bytes BIGINT,
          final_video_duration_seconds REAL,
          failed_scenes_count INTEGER DEFAULT 0,
          retry_count INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          CONSTRAINT unique_job_metric UNIQUE(job_id)
      );
    `);

    console.log('✅ Created job_metrics table');

    // Create generation_history table
    await db.query(`
      CREATE TABLE IF NOT EXISTS generation_history (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          scene_id UUID NOT NULL REFERENCES news_scenes(id) ON DELETE CASCADE,
          job_id UUID NOT NULL,
          attempt_number INTEGER NOT NULL,
          image_url TEXT,
          generation_params JSONB,
          whisk_request_id TEXT,
          success BOOLEAN NOT NULL,
          error_message TEXT,
          generation_time_ms INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    console.log('✅ Created generation_history table');

    // Create indexes
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_job_metrics_job_id ON job_metrics(job_id);
      CREATE INDEX IF NOT EXISTS idx_generation_history_scene_id ON generation_history(scene_id);
      CREATE INDEX IF NOT EXISTS idx_generation_history_job_id ON generation_history(job_id);
    `);

    console.log('✅ Created indexes');
    console.log('✅ Migration completed successfully');

    await db.shutdown();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await db.shutdown();
    process.exit(1);
  }
}

runMigration();

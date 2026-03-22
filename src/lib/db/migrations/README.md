# Database Migrations

This directory contains SQL migration scripts for database schema updates.

## Running Migrations

To apply a migration to your database:

```bash
npx tsx scripts/run-migration.ts <migration-file>
```

### Example

```bash
cd obsidian-news-desk
npx tsx scripts/run-migration.ts 001_add_metrics_tables.sql
```

## Available Migrations

### 001_add_metrics_tables.sql

**Date:** 2026-03-22
**Status:** Required for production analytics

Adds performance metrics and audit trail tables:

- **job_metrics** - Tracks timing and resource usage for each job
  - Analysis time (ms)
  - Total image generation time (ms)
  - Avatar generation time (ms)
  - Render time (ms)
  - Total processing time (ms)
  - Scene count
  - Final video size and duration
  - Failed scenes count
  - Retry count

- **generation_history** - Audit trail for all image generation attempts
  - Scene ID and job ID
  - Attempt number (for retry tracking)
  - Generated image URL
  - Generation parameters (JSONB)
  - Success/failure status
  - Error message (if failed)
  - Generation time for this specific attempt
  - Whisk API request ID (for debugging)

## What Gets Tracked Automatically

After running this migration, the following metrics are automatically recorded:

### analyze.worker.ts
- Analysis start/end time
- Scene count
- Creates job_metrics record

### images.worker.ts
- Each image generation attempt (success or failure)
- Generation parameters (prompt, aspect ratio, model)
- Attempt timing
- Error messages for failed attempts
- Records in generation_history table

### render.worker.ts
- Render start/end time
- Total image generation time (sum from generation_history)
- Total processing time (job creation to completion)
- Final video size and duration
- Updates job_metrics record

## Analytics API

The enhanced `/api/analytics` endpoint uses these tables to provide:

- **Performance breakdown** by stage (analysis, images, rendering)
- **Image generation statistics** (success rate, avg time)
- **Historical trends** (processing time over time)
- **Retry analysis** (scenes requiring multiple attempts)

### Example Response

```json
{
  "totalJobs": 42,
  "completedJobs": 38,
  "failedJobs": 2,
  "pendingJobs": 2,
  "successRate": 90.5,
  "avgProcessingTime": "22m 14s",
  "performanceBreakdown": {
    "analysis": "1m 2s",
    "imageGeneration": "18m 32s",
    "rendering": "2m 40s",
    "total": "22m 14s"
  },
  "imageGenerationStats": {
    "totalAttempts": 320,
    "successfulAttempts": 304,
    "avgGenerationTime": "3m 28s",
    "successRate": "95.0"
  }
}
```

## Querying Metrics Directly

### Find slowest image generations
```sql
SELECT
  ns.ticker_headline,
  gh.generation_time_ms,
  gh.attempt_number,
  gh.created_at
FROM generation_history gh
JOIN news_scenes ns ON gh.scene_id = ns.id
WHERE gh.success = true
ORDER BY gh.generation_time_ms DESC
LIMIT 10;
```

### Analyze retry patterns
```sql
SELECT
  scene_id,
  COUNT(*) as total_attempts,
  COUNT(CASE WHEN success = true THEN 1 END) as successful_attempts
FROM generation_history
GROUP BY scene_id
HAVING COUNT(*) > 1
ORDER BY total_attempts DESC;
```

### Job performance overview
```sql
SELECT
  nj.id,
  nj.status,
  jm.analysis_time_ms,
  jm.total_image_gen_time_ms,
  jm.render_time_ms,
  jm.total_processing_time_ms,
  jm.scene_count,
  jm.failed_scenes_count,
  jm.final_video_size_bytes / 1024 / 1024 as size_mb
FROM news_jobs nj
LEFT JOIN job_metrics jm ON nj.id = jm.job_id
WHERE nj.status = 'completed'
ORDER BY jm.total_processing_time_ms DESC
LIMIT 10;
```

## Migration Checklist

When deploying to a new environment:

1. ✅ Run `001_add_metrics_tables.sql` migration
2. ✅ Verify tables exist: `\dt job_metrics` and `\dt generation_history` in psql
3. ✅ Restart BullMQ workers to pick up new logging code
4. ✅ Test analytics endpoint: `curl http://localhost:8347/api/analytics | jq`
5. ✅ Run a test job and verify metrics are being recorded

## Troubleshooting

### Migration fails with "relation already exists"
This is safe to ignore if you've already run the migration. The script uses `CREATE TABLE IF NOT EXISTS`.

### No metrics appearing in analytics
1. Check that the migration ran successfully
2. Verify workers are restarted (they cache queries)
3. Run a new job (existing jobs won't have metrics)
4. Query `job_metrics` table directly to verify data

### Performance impact
The metrics tables are lightweight:
- **job_metrics**: 1 row per job (~500 bytes)
- **generation_history**: 1-3 rows per scene (~1KB each)
- Indexes ensure fast queries
- Total overhead: <0.1% of render time

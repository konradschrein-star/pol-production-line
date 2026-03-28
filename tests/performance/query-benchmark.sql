-- Database Query Performance Benchmarks
-- Phase 8: Performance & Security - Performance Testing
--
-- Usage:
--   psql obsidian_news_desk -f tests/performance/query-benchmark.sql

-- Enable query statistics extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Reset stats before benchmarking
SELECT pg_stat_statements_reset();

PRINT 'Database Query Performance Benchmarks';
PRINT '=====================================';
PRINT '';

-- ============================================================================
-- Benchmark 1: Job List Pagination (Most Common Query)
-- ============================================================================

\echo '1. Job List Pagination (LIMIT 20 OFFSET 0)'
\timing on

EXPLAIN ANALYZE
SELECT
  id,
  title,
  status,
  created_at,
  updated_at
FROM news_jobs
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;

\timing off
\echo '';

-- ============================================================================
-- Benchmark 2: Scene Fetch for Job (Common Query)
-- ============================================================================

\echo '2. Scene Fetch for Job (by job_id)'
\timing on

-- Note: Replace 'sample-uuid' with actual job ID for real benchmark
EXPLAIN ANALYZE
SELECT *
FROM news_scenes
WHERE job_id = (SELECT id FROM news_jobs LIMIT 1)
ORDER BY scene_order ASC;

\timing off
\echo '';

-- ============================================================================
-- Benchmark 3: Bulk Delete (50 jobs)
-- ============================================================================

\echo '3. Bulk Delete (50 jobs simulation)'
\timing on

-- Note: This is a dry-run (SELECT instead of DELETE)
EXPLAIN ANALYZE
SELECT id
FROM news_jobs
WHERE id IN (
  SELECT id FROM news_jobs LIMIT 50
);

\timing off
\echo '';

-- ============================================================================
-- Benchmark 4: Metrics Aggregation (7-day average)
-- ============================================================================

\echo '4. Metrics Aggregation (7-day average)'
\timing on

EXPLAIN ANALYZE
SELECT
  AVG(analysis_time_ms / 1000.0) as avg_analysis_time_seconds,
  AVG(total_image_gen_time_ms / 1000.0) as avg_image_time_seconds,
  AVG(render_time_ms / 1000.0) as avg_render_time_seconds,
  AVG(total_processing_time_ms / 1000.0) as avg_total_time_seconds,
  COUNT(*) as job_count
FROM job_metrics
WHERE created_at > NOW() - INTERVAL '7 days';

\timing off
\echo '';

-- ============================================================================
-- Benchmark 5: Full-Text Search (Complex Query)
-- ============================================================================

\echo '5. Full-Text Search (plainto_tsquery)'
\timing on

EXPLAIN ANALYZE
SELECT
  id,
  title,
  raw_script,
  status,
  created_at
FROM news_jobs
WHERE to_tsvector('english', raw_script || ' ' || COALESCE(title, ''))
  @@ plainto_tsquery('english', 'breaking news')
ORDER BY created_at DESC
LIMIT 20;

\timing off
\echo '';

-- ============================================================================
-- Benchmark 6: Audit Log Query (Security Monitoring)
-- ============================================================================

\echo '6. Audit Log Query (last 1 hour, by severity)'
\timing on

EXPLAIN ANALYZE
SELECT
  event_type,
  actor,
  action,
  severity,
  timestamp
FROM audit_log
WHERE timestamp > NOW() - INTERVAL '1 hour'
  AND severity IN ('warning', 'critical')
ORDER BY timestamp DESC
LIMIT 100;

\timing off
\echo '';

-- ============================================================================
-- View Slowest Queries
-- ============================================================================

\echo 'Slowest Queries (Top 10 by mean execution time)'
\echo '================================================';

SELECT
  substring(query, 1, 80) as query,
  calls,
  round(total_exec_time::numeric, 2) as total_time_ms,
  round(mean_exec_time::numeric, 2) as mean_time_ms,
  round(max_exec_time::numeric, 2) as max_time_ms,
  round(stddev_exec_time::numeric, 2) as stddev_time_ms
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

\echo '';

-- ============================================================================
-- Check Index Usage
-- ============================================================================

\echo 'Index Usage Statistics';
\echo '=====================';

SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

\echo '';

-- ============================================================================
-- Identify Unused Indexes
-- ============================================================================

\echo 'Unused Indexes (idx_scan = 0)';
\echo '=============================';

SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname = 'public'
  AND indexrelname NOT LIKE 'pg_toast%'
ORDER BY pg_relation_size(indexrelid) DESC;

\echo '';

-- ============================================================================
-- Table Statistics
-- ============================================================================

\echo 'Table Statistics';
\echo '================';

SELECT
  schemaname,
  tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  n_live_tup as live_rows,
  n_dead_tup as dead_rows,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

\echo '';

-- ============================================================================
-- Recommendations
-- ============================================================================

\echo 'Query Optimization Recommendations';
\echo '===================================';
\echo '';
\echo '1. If job list pagination is slow (>50ms):';
\echo '   CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON news_jobs (created_at DESC);';
\echo '';
\echo '2. If scene fetch is slow (>20ms):';
\echo '   CREATE INDEX IF NOT EXISTS idx_scenes_job_order ON news_scenes (job_id, scene_order);';
\echo '';
\echo '3. If full-text search is slow (>100ms):';
\echo '   CREATE INDEX IF NOT EXISTS idx_jobs_fulltext ON news_jobs USING GIN (to_tsvector(''english'', raw_script || '' '' || COALESCE(title, '''')));';
\echo '';
\echo '4. If audit log queries are slow (>50ms):';
\echo '   CREATE INDEX IF NOT EXISTS idx_audit_timestamp_severity ON audit_log (timestamp DESC, severity) WHERE severity IN (''warning'', ''critical'');';
\echo '';
\echo '5. If table bloat is high (dead_rows > 10% of live_rows):';
\echo '   VACUUM ANALYZE news_jobs;';
\echo '   VACUUM ANALYZE news_scenes;';
\echo '';

# Database Query Optimization Guide

## Overview

This document provides query optimization recommendations based on profiling results from Phase 8 performance testing.

**Last Profiled:** [To be filled after running benchmarks]
**Database:** PostgreSQL 17
**Dataset Size:** [To be filled]
- news_jobs: [X] rows
- news_scenes: [X] rows
- job_metrics: [X] rows
- audit_log: [X] rows

---

## Current Indexes

### news_jobs Table

```sql
-- Primary key
CREATE UNIQUE INDEX news_jobs_pkey ON news_jobs (id);

-- Existing indexes (from exploration)
CREATE INDEX idx_jobs_created_at ON news_jobs (created_at DESC);
CREATE INDEX idx_jobs_status ON news_jobs (status);
```

### news_scenes Table

```sql
-- Primary key
CREATE UNIQUE INDEX news_scenes_pkey ON news_scenes (id);

-- Foreign key
CREATE INDEX idx_scenes_job_id ON news_scenes (job_id);
```

### job_metrics Table

```sql
-- Primary key
CREATE UNIQUE INDEX job_metrics_pkey ON job_metrics (id);

-- Existing indexes
CREATE INDEX idx_job_metrics_job_id ON job_metrics (job_id);
CREATE INDEX idx_job_metrics_created_at ON job_metrics (created_at DESC);
```

### audit_log Table

```sql
-- Primary key
CREATE UNIQUE INDEX audit_log_pkey ON audit_log (id);

-- Existing indexes
CREATE INDEX idx_audit_timestamp ON audit_log (timestamp DESC);
CREATE INDEX idx_audit_event_type ON audit_log (event_type);
CREATE INDEX idx_audit_resource ON audit_log (resource_type, resource_id);
CREATE INDEX idx_audit_severity ON audit_log (severity) WHERE severity IN ('warning', 'critical');
CREATE INDEX idx_audit_actor ON audit_log (actor);
```

---

## Recommended Indexes

### 1. Composite Index for Scene Fetching

**Problem:** Fetching scenes for a job requires sorting by scene_order after filtering by job_id.

**Current Query:**
```sql
SELECT * FROM news_scenes
WHERE job_id = 'some-uuid'
ORDER BY scene_order ASC;
```

**Current Performance:** [TBD after benchmark]

**Recommendation:**
```sql
CREATE INDEX IF NOT EXISTS idx_scenes_job_order
ON news_scenes (job_id, scene_order);
```

**Why This Helps:**
- Composite index allows index-only scan for both filter and sort
- Eliminates separate sort step
- Expected improvement: 50-70% faster

**Expected Performance:** [TBD after implementation]

---

### 2. Partial Index for Failed Jobs

**Problem:** Querying failed jobs is common for error recovery, but full index on status wastes space.

**Current Query:**
```sql
SELECT * FROM news_jobs
WHERE status = 'failed'
ORDER BY created_at DESC;
```

**Recommendation:**
```sql
CREATE INDEX IF NOT EXISTS idx_jobs_failed
ON news_jobs (created_at DESC)
WHERE status = 'failed';
```

**Why This Helps:**
- Partial index is smaller (only failed jobs)
- Faster scans due to smaller index size
- Expected improvement: 30-50% faster for failed job queries

---

### 3. Covering Index for Job List (Index-Only Scan)

**Problem:** Job list pagination requires multiple columns, causing index scan + heap fetch.

**Current Query:**
```sql
SELECT id, title, status, created_at, updated_at
FROM news_jobs
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;
```

**Recommendation:**
```sql
CREATE INDEX IF NOT EXISTS idx_jobs_list
ON news_jobs (created_at DESC)
INCLUDE (id, title, status, updated_at);
```

**Why This Helps:**
- Covering index allows index-only scan (no heap fetch)
- All required columns are in the index
- Expected improvement: 40-60% faster

---

### 4. Full-Text Search Index (GIN)

**Problem:** Full-text search on raw_script is slow without specialized index.

**Current Query:**
```sql
SELECT * FROM news_jobs
WHERE to_tsvector('english', raw_script || ' ' || COALESCE(title, ''))
  @@ plainto_tsquery('english', 'breaking news');
```

**Recommendation:**
```sql
CREATE INDEX IF NOT EXISTS idx_jobs_fulltext
ON news_jobs
USING GIN (to_tsvector('english', raw_script || ' ' || COALESCE(title, '')));
```

**Why This Helps:**
- GIN index is optimized for full-text search
- Dramatically faster for text queries
- Expected improvement: 90-95% faster (10x-20x speedup)

**Trade-off:** Larger index size (GIN indexes are bigger than B-tree)

---

### 5. Composite Index for Audit Log Filtering

**Problem:** Querying audit log by timestamp + severity requires two separate index scans.

**Current Query:**
```sql
SELECT * FROM audit_log
WHERE timestamp > NOW() - INTERVAL '1 hour'
  AND severity IN ('warning', 'critical')
ORDER BY timestamp DESC;
```

**Current Index:** Separate indexes on timestamp and severity

**Recommendation:**
```sql
CREATE INDEX IF NOT EXISTS idx_audit_timestamp_severity
ON audit_log (timestamp DESC, severity)
WHERE severity IN ('warning', 'critical');
```

**Why This Helps:**
- Single index scan instead of two
- Partial index reduces size (only warning + critical)
- Expected improvement: 30-40% faster

---

## Query Optimization Results

### Before Optimization

| Query | Avg Time | p95 Time | Status |
|-------|----------|----------|--------|
| Job list pagination | [TBD]ms | [TBD]ms | [PASS/FAIL] |
| Scene fetch for job | [TBD]ms | [TBD]ms | [PASS/FAIL] |
| Bulk delete (50 jobs) | [TBD]ms | [TBD]ms | [PASS/FAIL] |
| Metrics aggregation | [TBD]ms | [TBD]ms | [PASS/FAIL] |
| Full-text search | [TBD]ms | [TBD]ms | [PASS/FAIL] |
| Audit log query | [TBD]ms | [TBD]ms | [PASS/FAIL] |

### After Optimization

| Query | Avg Time | p95 Time | Improvement | Status |
|-------|----------|----------|-------------|--------|
| Job list pagination | [TBD]ms | [TBD]ms | [TBD]% | [PASS/FAIL] |
| Scene fetch for job | [TBD]ms | [TBD]ms | [TBD]% | [PASS/FAIL] |
| Bulk delete (50 jobs) | [TBD]ms | [TBD]ms | [TBD]% | [PASS/FAIL] |
| Metrics aggregation | [TBD]ms | [TBD]ms | [TBD]% | [PASS/FAIL] |
| Full-text search | [TBD]ms | [TBD]ms | [TBD]% | [PASS/FAIL] |
| Audit log query | [TBD]ms | [TBD]ms | [TBD]% | [PASS/FAIL] |

---

## Maintenance Recommendations

### 1. Regular VACUUM ANALYZE

**Purpose:** Update table statistics and reclaim space from dead tuples.

**Schedule:** Weekly (or when table bloat > 10%)

```sql
-- Vacuum all tables
VACUUM ANALYZE news_jobs;
VACUUM ANALYZE news_scenes;
VACUUM ANALYZE job_metrics;
VACUUM ANALYZE audit_log;
VACUUM ANALYZE style_presets;
VACUUM ANALYZE generation_history;
```

**Monitoring:**
```sql
-- Check table bloat
SELECT
  schemaname,
  tablename,
  n_live_tup as live_rows,
  n_dead_tup as dead_rows,
  round(100.0 * n_dead_tup / NULLIF(n_live_tup, 0), 2) as dead_percent
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND n_live_tup > 0
ORDER BY dead_percent DESC;
```

### 2. Reindex Occasionally

**Purpose:** Rebuild indexes to eliminate bloat and improve performance.

**Schedule:** Quarterly (or after large data changes)

```sql
-- Reindex all tables (WARNING: locks tables)
REINDEX TABLE news_jobs;
REINDEX TABLE news_scenes;
REINDEX TABLE job_metrics;
REINDEX TABLE audit_log;
```

**Note:** Use `REINDEX CONCURRENTLY` in production to avoid locks (PostgreSQL 12+).

### 3. Archive Old Data

**Purpose:** Keep database size manageable and queries fast.

**Schedule:** Monthly

```sql
-- Archive audit logs older than 90 days
DELETE FROM audit_log
WHERE timestamp < NOW() - INTERVAL '90 days';

-- Archive completed jobs older than 180 days
DELETE FROM news_jobs
WHERE status = 'completed'
  AND completed_at < NOW() - INTERVAL '180 days';

-- Vacuum after deletion
VACUUM ANALYZE audit_log;
VACUUM ANALYZE news_jobs;
```

---

## Performance Targets

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Job list pagination | < 50ms (p95) | [TBD]ms | [PASS/FAIL] |
| Scene fetch | < 20ms (p95) | [TBD]ms | [PASS/FAIL] |
| Bulk operations | < 200ms (50 jobs) | [TBD]ms | [PASS/FAIL] |
| Metrics aggregation | < 100ms | [TBD]ms | [PASS/FAIL] |
| Full-text search | < 100ms (p95) | [TBD]ms | [PASS/FAIL] |
| Audit log query | < 50ms (p95) | [TBD]ms | [PASS/FAIL] |

---

## Troubleshooting Slow Queries

### 1. Identify Slow Query

```sql
-- Enable query logging in postgresql.conf
SET log_min_duration_statement = 100; -- Log queries > 100ms

-- Or check pg_stat_statements
SELECT
  substring(query, 1, 100) as query,
  calls,
  round(mean_exec_time::numeric, 2) as mean_ms,
  round(max_exec_time::numeric, 2) as max_ms
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### 2. Analyze Query Plan

```sql
EXPLAIN ANALYZE
<your-slow-query-here>;
```

**Look for:**
- **Seq Scan:** Full table scan (bad for large tables)
- **Index Scan:** Good, but check if index is being used
- **Nested Loop:** Can be slow for large datasets
- **Hash Join / Merge Join:** Generally faster for large datasets

### 3. Check Index Usage

```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE tablename = 'your_table'
ORDER BY idx_scan DESC;
```

### 4. Check for Missing Statistics

```sql
ANALYZE your_table;

-- Check when statistics were last updated
SELECT
  schemaname,
  tablename,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE tablename = 'your_table';
```

---

## Advanced Optimization Techniques

### 1. Materialized Views for Analytics

**Use Case:** Expensive aggregations run frequently (dashboard metrics).

**Example:**
```sql
CREATE MATERIALIZED VIEW mv_job_stats AS
SELECT
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as total_jobs,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_jobs,
  AVG(total_processing_time_ms) as avg_processing_time_ms
FROM job_metrics
GROUP BY DATE_TRUNC('day', created_at);

-- Refresh daily (via cron job)
REFRESH MATERIALIZED VIEW mv_job_stats;
```

### 2. Partitioning for Large Tables

**Use Case:** audit_log table grows to millions of rows.

**Example:**
```sql
-- Partition by month
CREATE TABLE audit_log_2026_03 PARTITION OF audit_log
FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE TABLE audit_log_2026_04 PARTITION OF audit_log
FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
```

### 3. Connection Pooling Optimization

**Current:** 50 connections max

**Recommendation:** Adjust based on workload
```javascript
// src/lib/db/index.ts
const pool = new Pool({
  max: 20, // Reduce if mostly idle
  // or
  max: 100, // Increase if high concurrency
});
```

**Rule of Thumb:** `max = (2 * CPU cores) + effective_spindle_count`

---

## Execution Instructions

```bash
# 1. Run query benchmarks
cd obsidian-news-desk
psql obsidian_news_desk -f tests/performance/query-benchmark.sql

# 2. Review results and identify slow queries

# 3. Apply recommended indexes
psql obsidian_news_desk -c "CREATE INDEX IF NOT EXISTS idx_scenes_job_order ON news_scenes (job_id, scene_order);"

# 4. Re-run benchmarks to verify improvement
psql obsidian_news_desk -f tests/performance/query-benchmark.sql

# 5. Update this document with results
```

---

**Last Updated:** [Date]
**Next Review:** [3 months from last update]

# Database Migrations Guide

This document explains the database migration system and how to apply schema changes.

## Migration System

The project uses SQL migration files located in `migrations/` directory. Each migration file is numbered sequentially and contains DDL statements to modify the database schema.

## Running Migrations

### Automated (Recommended)

Run all pending migrations automatically:

```bash
cd obsidian-news-desk
npm run migrate
```

This will:
1. Connect to the database using `DATABASE_URL` from `.env`
2. Create a `schema_migrations` tracking table (if it doesn't exist)
3. Run all migrations that haven't been applied yet
4. Record each successful migration in the tracking table
5. Skip migrations that were already applied

### Manual (Advanced)

Run a specific migration file directly:

```bash
psql $DATABASE_URL -f migrations/001_add_retry_columns.sql
```

## Available Migrations

### 001_add_retry_columns.sql

**Purpose:** Add retry tracking columns to `news_scenes` table

**Columns Added:**
- `retry_count` (INTEGER DEFAULT 0) - Tracks number of regeneration attempts
- `failed_permanently` (BOOLEAN DEFAULT false) - Marks scenes that exceeded retry limit

**Indexes Created:**
- `idx_news_scenes_retry_count` - For filtering by retry count
- `idx_news_scenes_failed_permanently` - For filtering failed scenes
- `idx_news_scenes_job_retry` - Composite index for job + retry queries

**When to Apply:** Required for image generation worker retry logic

---

### 002_add_jobs_columns.sql

**Purpose:** Add advanced rendering columns to `news_jobs` table

**Columns Added:**
- `word_timestamps` (JSONB) - Word-level timestamps for precise audio-video sync
- `thumbnail_url` (TEXT) - URL/path to video thumbnail image
- `thumbnail_generated_at` (TIMESTAMP) - Timestamp when thumbnail was generated

**Indexes Created:**
- `idx_news_jobs_thumbnail_generated_at` - For thumbnail queries
- `idx_news_jobs_word_timestamps` (GIN) - For JSONB queries on word timestamps

**When to Apply:** Required for advanced Remotion rendering features

---

### 003_add_indexes.sql

**Purpose:** Add performance indexes for common queries

**Indexes Created:**
- `idx_news_scenes_job_id` - For job → scenes lookups (most common query)
- `idx_news_jobs_status` - For filtering jobs by status
- `idx_news_scenes_job_status` - Composite for job + generation status
- `idx_news_jobs_created_at` - For sorting by creation date
- `idx_news_jobs_updated_at` - For sorting by update date
- `idx_news_jobs_status_created` - Composite for status filter + sort

**When to Apply:** Recommended for production deployments to improve query performance

---

## Migration Tracking

Migrations are tracked in the `schema_migrations` table:

```sql
CREATE TABLE schema_migrations (
  id SERIAL PRIMARY KEY,
  migration_name VARCHAR(255) UNIQUE NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

To check which migrations have been applied:

```sql
SELECT * FROM schema_migrations ORDER BY applied_at;
```

## Rollback (Manual)

There is no automated rollback. To undo a migration, manually write and execute the reverse SQL statements.

### Example: Rolling back 001_add_retry_columns.sql

```sql
-- Remove indexes
DROP INDEX IF EXISTS idx_news_scenes_job_retry;
DROP INDEX IF EXISTS idx_news_scenes_failed_permanently;
DROP INDEX IF EXISTS idx_news_scenes_retry_count;

-- Remove columns
ALTER TABLE news_scenes DROP COLUMN IF EXISTS failed_permanently;
ALTER TABLE news_scenes DROP COLUMN IF EXISTS retry_count;

-- Remove from tracking table
DELETE FROM schema_migrations WHERE migration_name = '001_add_retry_columns.sql';
```

## Creating New Migrations

1. **Create new SQL file:**
   ```bash
   touch migrations/004_your_migration_name.sql
   ```

2. **Write SQL statements:**
   ```sql
   -- Migration 004: Description of what this does
   
   ALTER TABLE table_name ADD COLUMN new_column TEXT;
   CREATE INDEX idx_name ON table_name(new_column);
   
   COMMENT ON COLUMN table_name.new_column IS 'Description of purpose';
   ```

3. **Add to migration runner:**
   Edit `scripts/run-migrations.js` and add the new file to `migrationFiles` array:
   ```javascript
   const migrationFiles = [
     '001_add_retry_columns.sql',
     '002_add_jobs_columns.sql',
     '003_add_indexes.sql',
     '004_your_migration_name.sql', // ADD THIS
   ];
   ```

4. **Test migration:**
   ```bash
   npm run migrate
   ```

## Troubleshooting

### Error: "migration failed"

**Cause:** SQL syntax error or constraint violation

**Fix:**
1. Read the error message carefully
2. Check the SQL syntax in the migration file
3. Fix the SQL and re-run `npm run migrate`

---

### Error: "column already exists"

**Cause:** Migration was partially applied or run manually

**Fix:**
1. Check if column exists: `\d table_name` in psql
2. If column exists, mark migration as applied:
   ```sql
   INSERT INTO schema_migrations (migration_name) VALUES ('001_add_retry_columns.sql');
   ```

---

### Error: "relation does not exist"

**Cause:** Database schema not initialized

**Fix:**
1. Run initial schema setup: `npm run init-db`
2. Then run migrations: `npm run migrate`

---

## Production Deployment Checklist

Before deploying to production:

- [ ] Backup database: `pg_dump $DATABASE_URL > backup.sql`
- [ ] Test migrations on staging database first
- [ ] Run `npm run migrate` during deployment
- [ ] Verify all migrations applied: `SELECT * FROM schema_migrations;`
- [ ] Test application endpoints after migration
- [ ] Monitor logs for any errors

---

**Last Updated:** 2026-03-23
**Migration System Version:** 1.0

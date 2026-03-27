-- Add YouTube SEO metadata columns to news_jobs table

ALTER TABLE news_jobs ADD COLUMN IF NOT EXISTS youtube_title TEXT;
ALTER TABLE news_jobs ADD COLUMN IF NOT EXISTS youtube_description TEXT;
ALTER TABLE news_jobs ADD COLUMN IF NOT EXISTS youtube_tags JSONB;
ALTER TABLE news_jobs ADD COLUMN IF NOT EXISTS youtube_keywords JSONB;
ALTER TABLE news_jobs ADD COLUMN IF NOT EXISTS youtube_hashtags JSONB;
ALTER TABLE news_jobs ADD COLUMN IF NOT EXISTS youtube_category TEXT;
ALTER TABLE news_jobs ADD COLUMN IF NOT EXISTS youtube_thumbnail_suggestions JSONB;
ALTER TABLE news_jobs ADD COLUMN IF NOT EXISTS seo_generated_at TIMESTAMP WITH TIME ZONE;

-- Add index for querying jobs with SEO metadata
CREATE INDEX IF NOT EXISTS idx_news_jobs_seo_generated
ON news_jobs(seo_generated_at)
WHERE seo_generated_at IS NOT NULL;

-- Add Whisk reference image support and generation tracking
-- This enables reference-guided image generation with subject, scene, and style references

-- Add reference image storage to scenes
ALTER TABLE news_scenes
ADD COLUMN reference_images JSONB DEFAULT NULL,
ADD COLUMN generation_params JSONB DEFAULT NULL,
ADD COLUMN whisk_request_id VARCHAR(255) DEFAULT NULL;

-- Index for fast JSONB queries
CREATE INDEX idx_news_scenes_reference_images
ON news_scenes USING GIN (reference_images);

CREATE INDEX idx_news_scenes_generation_params
ON news_scenes USING GIN (generation_params);

-- Add job-level reference library (reusable across scenes)
ALTER TABLE news_jobs
ADD COLUMN reference_library JSONB DEFAULT NULL;

-- Comments for documentation
COMMENT ON COLUMN news_scenes.reference_images IS
  '{"subject": "local_path_or_url", "scene": "...", "style": "..."}';

COMMENT ON COLUMN news_scenes.generation_params IS
  'Full generation context: {"model": "IMAGEN_3_5", "seed": 123, "aspectRatio": "LANDSCAPE", "hadReferences": true}';

COMMENT ON COLUMN news_scenes.whisk_request_id IS
  'Whisk API workflow ID for debugging and tracking';

COMMENT ON COLUMN news_jobs.reference_library IS
  'Job-level reference images: {"brand_style": "path", "news_desk_bg": "path"}';

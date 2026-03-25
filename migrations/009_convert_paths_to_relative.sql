-- Migration 009: Convert Absolute Paths to Relative Paths
-- Purpose: Make database portable across different machines and user accounts
-- Date: 2026-03-25
-- Impact: Updates all file paths in database from absolute to relative format
--
-- Before: C:\Users\konra\ObsidianNewsDesk\images\uuid-123.jpg
-- After:  images/uuid-123.jpg
--
-- Safe to run multiple times (idempotent)

BEGIN;

-- 1. Convert image paths in news_scenes table
-- Extracts the relative path portion after "images/", "avatars/", or "videos/"
UPDATE news_scenes
SET image_url = regexp_replace(image_url, '^.*[/\\](images|avatars|videos)[/\\]', '\1/', 'g')
WHERE image_url IS NOT NULL
  AND image_url ~ '[/\\](images|avatars|videos)[/\\]'
  AND image_url ~ '^[a-zA-Z]:[/\\]'; -- Only convert absolute paths (Windows format)

-- 2. Convert avatar paths in news_jobs table
UPDATE news_jobs
SET avatar_mp4_url = regexp_replace(avatar_mp4_url, '^.*[/\\](avatars)[/\\]', '\1/', 'g')
WHERE avatar_mp4_url IS NOT NULL
  AND avatar_mp4_url ~ '[/\\]avatars[/\\]'
  AND avatar_mp4_url ~ '^[a-zA-Z]:[/\\]'; -- Only convert absolute paths

-- 3. Convert video paths in news_jobs table
UPDATE news_jobs
SET final_video_url = regexp_replace(final_video_url, '^.*[/\\](videos)[/\\]', '\1/', 'g')
WHERE final_video_url IS NOT NULL
  AND final_video_url ~ '[/\\]videos[/\\]'
  AND final_video_url ~ '^[a-zA-Z]:[/\\]'; -- Only convert absolute paths

-- 4. Convert thumbnail paths in news_jobs table (if any exist)
UPDATE news_jobs
SET thumbnail_url = regexp_replace(thumbnail_url, '^.*[/\\](images|videos)[/\\]', '\1/', 'g')
WHERE thumbnail_url IS NOT NULL
  AND thumbnail_url ~ '[/\\](images|videos)[/\\]'
  AND thumbnail_url ~ '^[a-zA-Z]:[/\\]'; -- Only convert absolute paths

-- 5. Convert paths in generation_history table (tracks image generation attempts)
UPDATE generation_history
SET image_url = regexp_replace(image_url, '^.*[/\\](images)[/\\]', '\1/', 'g')
WHERE image_url IS NOT NULL
  AND image_url ~ '[/\\]images[/\\]'
  AND image_url ~ '^[a-zA-Z]:[/\\]'; -- Only convert absolute paths

-- 6. Normalize path separators to forward slashes (cross-platform compatibility)
-- Some paths might have backslashes in the relative portion
UPDATE news_scenes
SET image_url = replace(image_url, '\', '/')
WHERE image_url IS NOT NULL
  AND image_url LIKE '%\%';

UPDATE news_jobs
SET avatar_mp4_url = replace(avatar_mp4_url, '\', '/'),
    final_video_url = replace(final_video_url, '\', '/'),
    thumbnail_url = replace(thumbnail_url, '\', '/')
WHERE (avatar_mp4_url IS NOT NULL AND avatar_mp4_url LIKE '%\%')
   OR (final_video_url IS NOT NULL AND final_video_url LIKE '%\%')
   OR (thumbnail_url IS NOT NULL AND thumbnail_url LIKE '%\%');

UPDATE generation_history
SET image_url = replace(image_url, '\', '/')
WHERE image_url IS NOT NULL
  AND image_url LIKE '%\%';

COMMIT;

-- Verification queries (run manually to check results)
-- SELECT image_url FROM news_scenes WHERE image_url IS NOT NULL LIMIT 10;
-- SELECT avatar_mp4_url, final_video_url FROM news_jobs WHERE avatar_mp4_url IS NOT NULL OR final_video_url IS NOT NULL LIMIT 10;
-- SELECT image_url FROM generation_history WHERE image_url IS NOT NULL LIMIT 10;

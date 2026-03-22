-- Add word-level timestamps for transcript-based video pacing
-- This enables scene transitions to sync with natural speech patterns

ALTER TABLE news_jobs
ADD COLUMN word_timestamps JSONB;

COMMENT ON COLUMN news_jobs.word_timestamps IS 'Whisper transcription output with word-level timestamps: [{"word": "Breaking", "start": 0.0, "end": 0.45}, ...]';

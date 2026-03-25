-- Migration: Add sentence-to-scene mapping fields
-- Date: 2026-03-25
-- Description: Adds explicit sentence-to-scene mapping, shot types, and visual continuity tracking

-- Add new columns to news_scenes table
ALTER TABLE news_scenes
ADD COLUMN sentence_text TEXT,                          -- The exact sentence this scene visualizes
ADD COLUMN narrative_position VARCHAR(50),              -- opening|development|evidence|conclusion
ADD COLUMN shot_type VARCHAR(50),                       -- establishing|medium|closeup|detail
ADD COLUMN visual_continuity_notes TEXT,                -- AI explanation of visual flow
ADD COLUMN scene_context JSONB;                         -- Deprecated context data (for backwards compatibility)

-- Add constraint for narrative_position
ALTER TABLE news_scenes
ADD CONSTRAINT valid_narrative_position CHECK (
    narrative_position IS NULL OR
    narrative_position IN ('opening', 'development', 'evidence', 'conclusion')
);

-- Add constraint for shot_type
ALTER TABLE news_scenes
ADD CONSTRAINT valid_shot_type CHECK (
    shot_type IS NULL OR
    shot_type IN ('establishing', 'medium', 'closeup', 'detail')
);

-- Add index for filtering by narrative position
CREATE INDEX idx_news_scenes_narrative_position ON news_scenes(narrative_position);

-- Add index for filtering by shot type
CREATE INDEX idx_news_scenes_shot_type ON news_scenes(shot_type);

-- Add comment for documentation
COMMENT ON COLUMN news_scenes.sentence_text IS 'The exact sentence from the script that this scene visualizes (for precise narration-image synchronization)';
COMMENT ON COLUMN news_scenes.narrative_position IS 'Narrative position in story arc: opening (0-15%), development (15-70%), evidence (70-85%), conclusion (85-100%)';
COMMENT ON COLUMN news_scenes.shot_type IS 'Documentary cinematography shot type: establishing (wide), medium (subject in environment), closeup (emphasis), detail (macro/specific)';
COMMENT ON COLUMN news_scenes.visual_continuity_notes IS 'AI-generated notes explaining how this scene connects to previous/next scenes for visual coherence';
COMMENT ON COLUMN news_scenes.scene_context IS 'Deprecated: Legacy context field kept for backwards compatibility with old jobs';

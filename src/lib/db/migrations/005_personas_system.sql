/**
 * Migration 005: Personas/Templates System
 *
 * Adds support for reusable content personas for mass production.
 * Personas define content style, production settings, and AI behavior.
 *
 * Use cases:
 * - "Tech News" persona: Formal tone, blue color scheme, fast-paced editing
 * - "Entertainment Gossip" persona: Casual tone, vibrant colors, dramatic music
 * - "Finance Reports" persona: Professional tone, conservative colors, data-focused
 */

-- Create personas table
CREATE TABLE IF NOT EXISTS personas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Basic info
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(50),               -- e.g., "news", "entertainment", "education"

    -- Visual style
    style_preset_id UUID REFERENCES style_presets(id) ON DELETE SET NULL,
    color_scheme JSONB,                 -- {primary, secondary, accent, background}

    -- AI/Production settings
    ai_provider VARCHAR(20),            -- openai, claude, google, groq
    tone_guidelines TEXT,               -- e.g., "Professional, authoritative, fact-based"
    script_template TEXT,               -- Template for script structure
    target_audience TEXT,               -- e.g., "Tech professionals 25-45"

    -- Content specifications
    default_video_length_seconds INTEGER DEFAULT 60,
    scenes_per_video INTEGER DEFAULT 8,
    pacing_style VARCHAR(20) DEFAULT 'balanced',  -- fast, balanced, slow

    -- Audio/Music settings (for future expansion)
    music_genre VARCHAR(50),
    voice_style VARCHAR(50),            -- e.g., "energetic", "calm", "professional"

    -- Usage tracking
    jobs_created_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_system_preset BOOLEAN DEFAULT false,  -- True for built-in personas

    -- Metadata
    created_by VARCHAR(100),            -- User/creator identifier
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_personas_category ON personas(category);
CREATE INDEX IF NOT EXISTS idx_personas_active ON personas(is_active);
CREATE INDEX IF NOT EXISTS idx_personas_usage ON personas(jobs_created_count DESC);

-- Add persona reference to news_jobs
ALTER TABLE news_jobs
ADD COLUMN IF NOT EXISTS persona_id UUID REFERENCES personas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_news_jobs_persona ON news_jobs(persona_id);

-- Insert default system personas
INSERT INTO personas (
    name,
    description,
    category,
    tone_guidelines,
    target_audience,
    default_video_length_seconds,
    scenes_per_video,
    pacing_style,
    is_system_preset
) VALUES
(
    'Tech News (Default)',
    'Professional technology news reporting with modern visuals and fast pacing',
    'technology',
    'Professional, authoritative, fact-based. Focus on innovation and technical accuracy.',
    'Tech professionals and enthusiasts aged 25-45',
    60,
    8,
    'balanced',
    true
),
(
    'Breaking News',
    'Urgent news updates with dramatic visuals and fast-paced delivery',
    'news',
    'Urgent, attention-grabbing, concise. Deliver key facts quickly.',
    'General audience seeking immediate updates',
    45,
    6,
    'fast',
    true
),
(
    'Educational Explainer',
    'In-depth educational content with clear visuals and patient pacing',
    'education',
    'Clear, patient, educational. Break down complex topics into digestible segments.',
    'Learners of all levels seeking understanding',
    90,
    10,
    'slow',
    true
);

-- Comments for documentation
COMMENT ON TABLE personas IS 'Reusable content personas/templates for consistent mass production. Defines style, tone, and production settings.';
COMMENT ON COLUMN personas.script_template IS 'Optional template structure for script generation (e.g., intro, context, analysis, conclusion)';
COMMENT ON COLUMN personas.pacing_style IS 'Controls image transition timing: fast (1s), balanced (1.5s), slow (2s)';
COMMENT ON COLUMN personas.is_system_preset IS 'True for built-in personas that cannot be deleted';

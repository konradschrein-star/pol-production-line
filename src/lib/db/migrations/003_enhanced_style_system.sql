-- Migration: Enhanced Style System
-- Date: 2026-03-23
-- Description: Expand style_presets table with rich visual metadata for context-aware prompt generation

-- Add new columns to style_presets table
ALTER TABLE style_presets
ADD COLUMN IF NOT EXISTS visual_guidelines TEXT,
ADD COLUMN IF NOT EXISTS color_palette JSONB,
ADD COLUMN IF NOT EXISTS composition_rules TEXT,
ADD COLUMN IF NOT EXISTS example_prompts JSONB,
ADD COLUMN IF NOT EXISTS reference_strategy VARCHAR(50) DEFAULT 'none';

-- Add check constraint for reference strategy
ALTER TABLE style_presets
ADD CONSTRAINT valid_reference_strategy CHECK (
  reference_strategy IN ('none', 'style_only', 'scene_based', 'adaptive')
);

-- Add scene context tracking to news_scenes
ALTER TABLE news_scenes
ADD COLUMN IF NOT EXISTS scene_context JSONB;

-- Add helpful column comments
COMMENT ON COLUMN style_presets.visual_guidelines IS 'Detailed text guidance for LLM about visual style expectations, aesthetics, mood, lighting preferences';
COMMENT ON COLUMN style_presets.color_palette IS 'Structured color palette: {primary: "#...", secondary: "#...", accent: "#...", temperature: "cool/warm/balanced"}';
COMMENT ON COLUMN style_presets.composition_rules IS 'Framing and composition guidelines (rule of thirds, symmetry, perspective preferences, etc.)';
COMMENT ON COLUMN style_presets.example_prompts IS 'Array of example prompts that demonstrate this style';
COMMENT ON COLUMN style_presets.reference_strategy IS 'How to use reference images: none (text only), style_only (use preset references), scene_based (per-scene refs), adaptive (combine both)';
COMMENT ON COLUMN news_scenes.scene_context IS 'LLM-generated context about this scene: narrative role, visual continuity notes, emotional tone';

-- Update existing "Professional News" preset with enhanced data
UPDATE style_presets
SET
  visual_guidelines = 'Professional broadcast journalism aesthetic. Images should convey authority, credibility, and clarity. Avoid sensationalism. Focus on clean, well-lit compositions that support the narrative without overwhelming it. Suitable for serious political commentary and news analysis. Lighting should be professional and consistent. Colors should be balanced and not overly saturated. Compositions should be clean and uncluttered.',
  color_palette = '{"primary": "#2C3E50", "secondary": "#34495E", "accent": "#3498DB", "temperature": "cool"}',
  composition_rules = 'Use rule of thirds for balanced compositions. Prefer wide establishing shots for context, medium shots for detail. Maintain visual hierarchy with clear focal points. Avoid cluttered backgrounds. Use leading lines to guide viewer attention. Symmetry for institutional imagery. Consistent depth of field across scenes (f/2.8-f/4 equivalent).',
  example_prompts = '[
    "Wide shot of modern congressional chamber, professional lighting, photojournalism style, high resolution, editorial photography",
    "Close-up of hands signing legislation document, shallow depth of field, editorial photography, professional lighting",
    "Aerial view of Washington DC monuments at golden hour, high resolution, news photography, dramatic clouds",
    "Medium shot of government official at podium, professional broadcast lighting, neutral background, photojournalistic style"
  ]'::jsonb,
  reference_strategy = 'style_only'
WHERE name = 'Professional News';

-- Update "Dramatic Documentary" preset
UPDATE style_presets
SET
  visual_guidelines = 'Cinematic documentary style with high production value. Bold, impactful imagery with dramatic lighting and strong visual storytelling. Use color grading for emotional impact. Images should feel like frames from a high-budget documentary film. Balance drama with credibility.',
  color_palette = '{"primary": "#1A1A1A", "secondary": "#2D2D2D", "accent": "#FF6B35", "temperature": "warm_dramatic"}',
  composition_rules = 'Strong use of dramatic angles and perspective. High contrast lighting for impact. Use negative space for emphasis. Dynamic compositions with tension. Consistent color grading across scenes for cinematic feel.',
  example_prompts = '[
    "Low-angle shot of capitol building at dusk, dramatic storm clouds, cinematic lighting, high contrast, documentary style",
    "Close-up of historical document with dramatic side lighting, film grain, documentary aesthetic",
    "Wide shot of empty legislative chamber, moody lighting, cinematic composition, high production value"
  ]'::jsonb,
  reference_strategy = 'adaptive'
WHERE name = 'Dramatic Documentary';

-- Update "Minimalist Modern" preset
UPDATE style_presets
SET
  visual_guidelines = 'Clean, minimal aesthetic with emphasis on negative space and simplicity. Modern, high-tech feel. Use geometric shapes and clean lines. Color palette is restrained and intentional. Images should feel contemporary and forward-looking. Avoid clutter and complexity.',
  color_palette = '{"primary": "#FFFFFF", "secondary": "#F5F5F5", "accent": "#000000", "temperature": "neutral"}',
  composition_rules = 'Maximum negative space. Strong geometric compositions. Clean lines and simple shapes. Minimal elements in frame. High-key lighting. Symmetry and balance are key. Avoid busy backgrounds entirely.',
  example_prompts = '[
    "Minimal geometric representation of legislative process, clean white background, modern infographic style, high contrast",
    "Simple data visualization with clean typography, minimal color palette, modern design aesthetic",
    "Abstract representation of policy concepts, geometric shapes, minimal style, high-key lighting"
  ]'::jsonb,
  reference_strategy = 'none'
WHERE name = 'Minimalist Modern';

-- Update "Vintage Broadcast" preset
UPDATE style_presets
SET
  visual_guidelines = 'Classic broadcast news aesthetic reminiscent of 1980s-1990s news. Slightly muted colors, film grain texture, traditional compositions. Nostalgic but professional. Evokes credibility through historical association with trusted news broadcasts.',
  color_palette = '{"primary": "#8B7355", "secondary": "#6B5D52", "accent": "#D4A574", "temperature": "warm_vintage"}',
  composition_rules = 'Traditional news compositions. Centered framing. Classic camera angles. Conservative use of space. Balanced, formal compositions. Avoid modern visual trends. Emulate classic broadcast aesthetics.',
  example_prompts = '[
    "Classic news studio setup with vintage aesthetic, 1990s broadcast style, film grain, muted colors, professional lighting",
    "Traditional news desk composition, vintage broadcast aesthetic, classic camera angle, warm color grading",
    "Archival-style photograph of historical political event, vintage news photography, film texture, muted tones"
  ]'::jsonb,
  reference_strategy = 'style_only'
WHERE name = 'Vintage Broadcast';

-- Update "Tech Innovation" preset
UPDATE style_presets
SET
  visual_guidelines = 'Futuristic, high-tech aesthetic. Clean, modern imagery with technology focus. Use blue and cyan tones. Images should feel cutting-edge and forward-looking. Emphasis on innovation, data, and digital concepts. Suitable for tech policy and innovation news.',
  color_palette = '{"primary": "#0A4D68", "secondary": "#088395", "accent": "#00C4FF", "temperature": "cool_tech"}',
  composition_rules = 'Modern, dynamic compositions. Use depth of field to emphasize key elements. Technology-focused framing. Clean backgrounds with tech elements. Blue-tinted color grading. Grid patterns and data visualization elements.',
  example_prompts = '[
    "Modern data center with server racks, blue accent lighting, high-tech facility, professional photography, deep blue tones",
    "Close-up of circuit board with bokeh effect, macro photography, blue color grade, technological aesthetic",
    "Abstract network visualization, data flowing through digital space, blue and cyan tones, high-tech rendering"
  ]'::jsonb,
  reference_strategy = 'adaptive'
WHERE name = 'Tech Innovation';

-- Add new "Political Commentary" preset optimized for political analysis content
INSERT INTO style_presets (name, description, visual_guidelines, color_palette, composition_rules, prompt_prefix, prompt_suffix, example_prompts, reference_strategy, is_default)
VALUES (
  'Political Commentary',
  'Optimized for political analysis and commentary content with bold, impactful imagery',
  'Bold, impactful imagery that captures political gravitas while remaining visually coherent. Balance dramatic elements with professional credibility. Use visual metaphors and symbolism when appropriate. Color grading should be consistent across scenes to create a unified narrative flow. Images should support the commentary without becoming sensational. Focus on institutional imagery, political symbols, and relevant contextual scenes. Lighting should be consistent and professional. Avoid partisan visual cues unless explicitly required by the script content.',
  '{"primary": "#1A237E", "secondary": "#283593", "accent": "#FF5722", "temperature": "cool_dramatic"}',
  'Strong use of symmetry for institutional imagery. Dynamic angles for action/conflict themes. Consistent depth of field across scenes (f/2.8-f/4 equivalent). Use leading lines to guide viewer attention. Balance wide establishing shots with detail close-ups. Maintain visual consistency across the narrative arc. Opening scenes should establish the setting, development scenes should build the argument visually, concluding scenes should provide visual closure.',
  'High-quality editorial photography, ',
  ', professional political photojournalism, sharp focus, consistent lighting, editorial color grade, broadcast quality',
  '[
    "Symmetrical shot of capitol building illuminated at dusk, dramatic sky, wide angle lens, professional editorial photography, deep blue hour lighting",
    "Medium shot of diverse group of voters at polling station, natural lighting, photojournalism documentary style, authentic moment capture",
    "Close-up of legislative documents with American flag softly blurred in background, shallow depth of field, editorial photography, professional lighting",
    "Wide shot of empty legislative chamber, professional broadcast lighting, symmetrical composition, institutional aesthetic, serious tone",
    "Aerial view of political rally crowd, high angle perspective, documentary style, natural lighting, photojournalistic approach"
  ]'::jsonb,
  'adaptive',
  FALSE
) ON CONFLICT (name) DO UPDATE
SET
  description = EXCLUDED.description,
  visual_guidelines = EXCLUDED.visual_guidelines,
  color_palette = EXCLUDED.color_palette,
  composition_rules = EXCLUDED.composition_rules,
  prompt_prefix = EXCLUDED.prompt_prefix,
  prompt_suffix = EXCLUDED.prompt_suffix,
  example_prompts = EXCLUDED.example_prompts,
  reference_strategy = EXCLUDED.reference_strategy,
  updated_at = NOW();

-- Add index on reference_strategy for performance
CREATE INDEX IF NOT EXISTS idx_style_presets_reference_strategy ON style_presets(reference_strategy);

-- Add index on news_scenes.scene_context for JSONB queries
CREATE INDEX IF NOT EXISTS idx_news_scenes_scene_context ON news_scenes USING GIN (scene_context);

-- Update updated_at timestamps for modified presets
UPDATE style_presets SET updated_at = NOW() WHERE name IN ('Professional News', 'Dramatic Documentary', 'Minimalist Modern', 'Vintage Broadcast', 'Tech Innovation');

-- Migration complete
COMMENT ON TABLE style_presets IS 'Visual style presets with rich metadata for context-aware prompt generation. Updated with enhanced fields for LLM guidance.';
COMMENT ON TABLE news_scenes IS 'Individual scenes for broadcast jobs. Now includes scene_context for visual coherence tracking.';

/**
 * Style Preset Manager
 * Handles loading and applying style presets to image prompts
 */

import { db } from '../db';

export interface StylePreset {
  id: string;
  name: string;
  description: string | null;
  reference_image_urls: string[] | null;
  prompt_prefix: string | null;
  prompt_suffix: string | null;
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface EnhancedStylePreset extends StylePreset {
  visual_guidelines: string | null;
  color_palette: {
    primary?: string;
    secondary?: string;
    accent?: string;
    temperature?: string;
  } | null;
  composition_rules: string | null;
  example_prompts: string[] | null;
  reference_strategy: 'none' | 'style_only' | 'scene_based' | 'adaptive';
}

export class StylePresetManager {
  /**
   * Get all available style presets
   */
  async getAll(): Promise<StylePreset[]> {
    const result = await db.query(
      `SELECT * FROM style_presets ORDER BY is_default DESC, name ASC`
    );

    return result.rows.map(row => ({
      ...row,
      reference_image_urls: row.reference_image_urls || null,
    }));
  }

  /**
   * Get a specific style preset by ID
   */
  async getById(id: string): Promise<StylePreset | null> {
    const result = await db.query(
      `SELECT * FROM style_presets WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return {
      ...result.rows[0],
      reference_image_urls: result.rows[0].reference_image_urls || null,
    };
  }

  /**
   * Get the default style preset
   */
  async getDefault(): Promise<StylePreset | null> {
    const result = await db.query(
      `SELECT * FROM style_presets WHERE is_default = TRUE LIMIT 1`
    );

    if (result.rows.length === 0) {
      return null;
    }

    return {
      ...result.rows[0],
      reference_image_urls: result.rows[0].reference_image_urls || null,
    };
  }

  /**
   * Apply a style preset to an image prompt
   * @param prompt - The base image prompt
   * @param presetId - The ID of the style preset to apply
   * @returns Modified prompt with style prefix/suffix
   */
  async applyToPrompt(prompt: string, presetId: string): Promise<string> {
    const preset = await this.getById(presetId);

    if (!preset) {
      console.warn(`Style preset ${presetId} not found, using original prompt`);
      return prompt;
    }

    let modifiedPrompt = prompt;

    // Apply prefix if exists
    if (preset.prompt_prefix) {
      modifiedPrompt = `${preset.prompt_prefix}${modifiedPrompt}`;
    }

    // Apply suffix if exists
    if (preset.prompt_suffix) {
      modifiedPrompt = `${modifiedPrompt}${preset.prompt_suffix}`;
    }

    console.log(`📐 [STYLE] Applied "${preset.name}" preset to prompt`);

    return modifiedPrompt;
  }

  /**
   * Create a new custom style preset
   */
  async create(data: {
    name: string;
    description?: string;
    reference_image_urls?: string[];
    prompt_prefix?: string;
    prompt_suffix?: string;
    visual_guidelines?: string;
    color_palette?: any;
    composition_rules?: string;
    example_prompts?: string[];
    reference_strategy?: string;
  }): Promise<StylePreset> {
    const result = await db.query(
      `INSERT INTO style_presets (
        name, description, reference_image_urls, prompt_prefix, prompt_suffix,
        visual_guidelines, color_palette, composition_rules, example_prompts, reference_strategy,
        is_default
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, FALSE)
       RETURNING *`,
      [
        data.name,
        data.description || null,
        data.reference_image_urls ? JSON.stringify(data.reference_image_urls) : null,
        data.prompt_prefix || null,
        data.prompt_suffix || null,
        data.visual_guidelines || null,
        data.color_palette ? JSON.stringify(data.color_palette) : null,
        data.composition_rules || null,
        data.example_prompts ? JSON.stringify(data.example_prompts) : null,
        data.reference_strategy || 'none',
      ]
    );

    return {
      ...result.rows[0],
      reference_image_urls: result.rows[0].reference_image_urls || null,
    };
  }

  /**
   * Update an existing style preset
   */
  async update(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      reference_image_urls: string[];
      prompt_prefix: string;
      prompt_suffix: string;
    }>
  ): Promise<StylePreset | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }

    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }

    if (data.reference_image_urls !== undefined) {
      updates.push(`reference_image_urls = $${paramIndex++}`);
      values.push(JSON.stringify(data.reference_image_urls));
    }

    if (data.prompt_prefix !== undefined) {
      updates.push(`prompt_prefix = $${paramIndex++}`);
      values.push(data.prompt_prefix);
    }

    if (data.prompt_suffix !== undefined) {
      updates.push(`prompt_suffix = $${paramIndex++}`);
      values.push(data.prompt_suffix);
    }

    if (updates.length === 0) {
      return this.getById(id);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await db.query(
      `UPDATE style_presets SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    return {
      ...result.rows[0],
      reference_image_urls: result.rows[0].reference_image_urls || null,
    };
  }

  /**
   * Delete a style preset
   */
  async delete(id: string): Promise<boolean> {
    const result = await db.query(
      `DELETE FROM style_presets WHERE id = $1 AND is_default = FALSE RETURNING id`,
      [id]
    );

    return result.rowCount! > 0;
  }

  /**
   * Build context-rich style instructions for LLM
   * Combines all style elements into structured prompt guidance
   *
   * @param presetId - The ID of the style preset
   * @returns Formatted style context string for LLM prompt injection
   */
  async buildStyleContext(presetId: string): Promise<string> {
    const result = await db.query(
      `SELECT * FROM style_presets WHERE id = $1`,
      [presetId]
    );

    if (result.rows.length === 0) {
      console.warn(`[STYLE] Preset ${presetId} not found, returning empty context`);
      return '';
    }

    const preset = result.rows[0] as EnhancedStylePreset;
    const sections: string[] = [];

    // Visual Guidelines
    if (preset.visual_guidelines) {
      sections.push(`VISUAL GUIDELINES:\n${preset.visual_guidelines}`);
    }

    // Composition Rules
    if (preset.composition_rules) {
      sections.push(`COMPOSITION RULES:\n${preset.composition_rules}`);
    }

    // Color Palette
    if (preset.color_palette) {
      const palette = preset.color_palette;
      const paletteLines = [];

      if (palette.primary) paletteLines.push(`Primary: ${palette.primary}`);
      if (palette.secondary) paletteLines.push(`Secondary: ${palette.secondary}`);
      if (palette.accent) paletteLines.push(`Accent: ${palette.accent}`);
      if (palette.temperature) paletteLines.push(`Temperature: ${palette.temperature}`);

      if (paletteLines.length > 0) {
        sections.push(`COLOR PALETTE:\n${paletteLines.join('\n')}`);
      }
    }

    // Example Prompts
    if (preset.example_prompts && preset.example_prompts.length > 0) {
      const examplesList = preset.example_prompts
        .map((p, i) => `${i + 1}. ${p}`)
        .join('\n');
      sections.push(`EXAMPLE PROMPTS (for reference):\n${examplesList}`);
    }

    // Prompt Modifiers
    if (preset.prompt_prefix || preset.prompt_suffix) {
      const modifiers = [];
      if (preset.prompt_prefix) modifiers.push(`Prefix: "${preset.prompt_prefix}"`);
      if (preset.prompt_suffix) modifiers.push(`Suffix: "${preset.prompt_suffix}"`);
      sections.push(`PROMPT MODIFIERS:\n${modifiers.join('\n')}`);
    }

    return sections.join('\n\n');
  }

  /**
   * Get reference image URLs for this preset (if using style references)
   *
   * @param presetId - The ID of the style preset
   * @returns Array of reference image URLs, or null if reference strategy is 'none'
   */
  async getReferenceImages(presetId: string): Promise<string[] | null> {
    const result = await db.query(
      `SELECT reference_strategy, reference_image_urls FROM style_presets WHERE id = $1`,
      [presetId]
    );

    if (result.rows.length === 0) {
      console.warn(`[STYLE] Preset ${presetId} not found`);
      return null;
    }

    const preset = result.rows[0];

    // If strategy is 'none', don't use reference images
    if (preset.reference_strategy === 'none') {
      return null;
    }

    return preset.reference_image_urls || null;
  }
}

// Singleton instance
export const stylePresetManager = new StylePresetManager();

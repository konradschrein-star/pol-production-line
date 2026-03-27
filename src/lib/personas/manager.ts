/**
 * Persona Manager
 *
 * Centralized service for managing content personas/templates.
 * Enables mass production with consistent style and tone across videos.
 *
 * MODULAR DESIGN: Reusable across all content formats (news, podcasts, shorts, etc.)
 *
 * @module personas-manager
 */

import { db } from '../db';

/**
 * Persona data structure
 */
export interface Persona {
  id: string;
  name: string;
  description?: string;
  category?: string;

  // Visual style
  stylePresetId?: string;
  colorScheme?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
  };

  // AI/Production settings
  aiProvider?: string;
  toneGuidelines?: string;
  scriptTemplate?: string;
  targetAudience?: string;

  // Content specifications
  defaultVideoLengthSeconds?: number;
  scenesPerVideo?: number;
  pacingStyle?: 'fast' | 'balanced' | 'slow';

  // Audio/Music (for future)
  musicGenre?: string;
  voiceStyle?: string;

  // Usage tracking
  jobsCreatedCount?: number;
  isActive?: boolean;
  isSystemPreset?: boolean;

  // Metadata
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
  lastUsedAt?: Date;
}

/**
 * Create persona input (subset of Persona)
 */
export type CreatePersonaInput = Omit<
  Persona,
  'id' | 'jobsCreatedCount' | 'isSystemPreset' | 'createdAt' | 'updatedAt' | 'lastUsedAt'
>;

/**
 * Update persona input (partial)
 */
export type UpdatePersonaInput = Partial<CreatePersonaInput>;

/**
 * Persona Manager
 *
 * Provides clean API for persona CRUD operations.
 */
export class PersonaManager {

  /**
   * Get all personas (optionally filter by active/category)
   */
  async getAll(filters?: {
    activeOnly?: boolean;
    category?: string;
    systemPresetsOnly?: boolean;
  }): Promise<Persona[]> {
    try {
      let query = 'SELECT * FROM personas WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (filters?.activeOnly) {
        query += ` AND is_active = $${paramIndex++}`;
        params.push(true);
      }

      if (filters?.category) {
        query += ` AND category = $${paramIndex++}`;
        params.push(filters.category);
      }

      if (filters?.systemPresetsOnly !== undefined) {
        query += ` AND is_system_preset = $${paramIndex++}`;
        params.push(filters.systemPresetsOnly);
      }

      query += ' ORDER BY is_system_preset DESC, jobs_created_count DESC, name ASC';

      const result = await db.query(query, params);

      return result.rows.map(this.mapRowToPersona);
    } catch (error) {
      console.error('❌ [Personas] Failed to fetch personas:', error);
      throw new Error('Failed to fetch personas');
    }
  }

  /**
   * Get persona by ID
   */
  async getById(id: string): Promise<Persona | null> {
    try {
      const result = await db.query(
        'SELECT * FROM personas WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToPersona(result.rows[0]);
    } catch (error) {
      console.error('❌ [Personas] Failed to fetch persona:', error);
      return null;
    }
  }

  /**
   * Get persona by name
   */
  async getByName(name: string): Promise<Persona | null> {
    try {
      const result = await db.query(
        'SELECT * FROM personas WHERE name = $1',
        [name]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToPersona(result.rows[0]);
    } catch (error) {
      console.error('❌ [Personas] Failed to fetch persona by name:', error);
      return null;
    }
  }

  /**
   * Create new persona
   */
  async create(input: CreatePersonaInput): Promise<Persona> {
    try {
      const result = await db.query(
        `INSERT INTO personas (
          name, description, category, style_preset_id, color_scheme,
          ai_provider, tone_guidelines, script_template, target_audience,
          default_video_length_seconds, scenes_per_video, pacing_style,
          music_genre, voice_style, is_active, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *`,
        [
          input.name,
          input.description || null,
          input.category || null,
          input.stylePresetId || null,
          input.colorScheme ? JSON.stringify(input.colorScheme) : null,
          input.aiProvider || null,
          input.toneGuidelines || null,
          input.scriptTemplate || null,
          input.targetAudience || null,
          input.defaultVideoLengthSeconds || 60,
          input.scenesPerVideo || 8,
          input.pacingStyle || 'balanced',
          input.musicGenre || null,
          input.voiceStyle || null,
          input.isActive !== undefined ? input.isActive : true,
          input.createdBy || 'system',
        ]
      );

      console.log(`✅ [Personas] Created persona: ${input.name}`);

      return this.mapRowToPersona(result.rows[0]);
    } catch (error) {
      console.error('❌ [Personas] Failed to create persona:', error);
      throw new Error('Failed to create persona');
    }
  }

  /**
   * Update existing persona
   */
  async update(id: string, updates: UpdatePersonaInput): Promise<Persona | null> {
    try {
      // Check if persona exists and is not system preset
      const existing = await this.getById(id);
      if (!existing) {
        return null;
      }

      if (existing.isSystemPreset) {
        throw new Error('Cannot modify system presets');
      }

      const fields: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (updates.name !== undefined) {
        fields.push(`name = $${paramIndex++}`);
        params.push(updates.name);
      }
      if (updates.description !== undefined) {
        fields.push(`description = $${paramIndex++}`);
        params.push(updates.description);
      }
      if (updates.category !== undefined) {
        fields.push(`category = $${paramIndex++}`);
        params.push(updates.category);
      }
      if (updates.stylePresetId !== undefined) {
        fields.push(`style_preset_id = $${paramIndex++}`);
        params.push(updates.stylePresetId);
      }
      if (updates.colorScheme !== undefined) {
        fields.push(`color_scheme = $${paramIndex++}`);
        params.push(JSON.stringify(updates.colorScheme));
      }
      if (updates.aiProvider !== undefined) {
        fields.push(`ai_provider = $${paramIndex++}`);
        params.push(updates.aiProvider);
      }
      if (updates.toneGuidelines !== undefined) {
        fields.push(`tone_guidelines = $${paramIndex++}`);
        params.push(updates.toneGuidelines);
      }
      if (updates.scriptTemplate !== undefined) {
        fields.push(`script_template = $${paramIndex++}`);
        params.push(updates.scriptTemplate);
      }
      if (updates.targetAudience !== undefined) {
        fields.push(`target_audience = $${paramIndex++}`);
        params.push(updates.targetAudience);
      }
      if (updates.defaultVideoLengthSeconds !== undefined) {
        fields.push(`default_video_length_seconds = $${paramIndex++}`);
        params.push(updates.defaultVideoLengthSeconds);
      }
      if (updates.scenesPerVideo !== undefined) {
        fields.push(`scenes_per_video = $${paramIndex++}`);
        params.push(updates.scenesPerVideo);
      }
      if (updates.pacingStyle !== undefined) {
        fields.push(`pacing_style = $${paramIndex++}`);
        params.push(updates.pacingStyle);
      }
      if (updates.musicGenre !== undefined) {
        fields.push(`music_genre = $${paramIndex++}`);
        params.push(updates.musicGenre);
      }
      if (updates.voiceStyle !== undefined) {
        fields.push(`voice_style = $${paramIndex++}`);
        params.push(updates.voiceStyle);
      }
      if (updates.isActive !== undefined) {
        fields.push(`is_active = $${paramIndex++}`);
        params.push(updates.isActive);
      }

      if (fields.length === 0) {
        return existing; // No updates
      }

      fields.push(`updated_at = NOW()`);
      params.push(id);

      const result = await db.query(
        `UPDATE personas SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        params
      );

      console.log(`✅ [Personas] Updated persona: ${id}`);

      return this.mapRowToPersona(result.rows[0]);
    } catch (error) {
      console.error('❌ [Personas] Failed to update persona:', error);
      throw error;
    }
  }

  /**
   * Delete persona (soft delete by setting is_active = false)
   */
  async delete(id: string): Promise<boolean> {
    try {
      const existing = await this.getById(id);
      if (!existing) {
        return false;
      }

      if (existing.isSystemPreset) {
        throw new Error('Cannot delete system presets');
      }

      await db.query(
        'UPDATE personas SET is_active = false, updated_at = NOW() WHERE id = $1',
        [id]
      );

      console.log(`✅ [Personas] Soft-deleted persona: ${id}`);

      return true;
    } catch (error) {
      console.error('❌ [Personas] Failed to delete persona:', error);
      throw error;
    }
  }

  /**
   * Increment job usage counter
   */
  async recordJobCreated(id: string): Promise<void> {
    try {
      await db.query(
        `UPDATE personas
         SET jobs_created_count = jobs_created_count + 1,
             last_used_at = NOW()
         WHERE id = $1`,
        [id]
      );

      console.log(`📊 [Personas] Incremented usage count for ${id}`);
    } catch (error) {
      console.error('❌ [Personas] Failed to record job creation:', error);
      // Don't throw - this shouldn't break job creation
    }
  }

  /**
   * Get usage statistics
   */
  async getUsageStats(): Promise<{
    totalPersonas: number;
    activePersonas: number;
    systemPresets: number;
    customPersonas: number;
    totalJobsCreated: number;
    topPersonas: Array<{ id: string; name: string; jobCount: number }>;
  }> {
    try {
      const statsResult = await db.query(`
        SELECT
          COUNT(*) as total_personas,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_personas,
          COUNT(CASE WHEN is_system_preset = true THEN 1 END) as system_presets,
          COUNT(CASE WHEN is_system_preset = false THEN 1 END) as custom_personas,
          SUM(jobs_created_count) as total_jobs_created
        FROM personas
      `);

      const topResult = await db.query(`
        SELECT id, name, jobs_created_count
        FROM personas
        WHERE is_active = true
        ORDER BY jobs_created_count DESC
        LIMIT 5
      `);

      const stats = statsResult.rows[0];

      return {
        totalPersonas: parseInt(stats.total_personas),
        activePersonas: parseInt(stats.active_personas),
        systemPresets: parseInt(stats.system_presets),
        customPersonas: parseInt(stats.custom_personas),
        totalJobsCreated: parseInt(stats.total_jobs_created || 0),
        topPersonas: topResult.rows.map(row => ({
          id: row.id,
          name: row.name,
          jobCount: row.jobs_created_count,
        })),
      };
    } catch (error) {
      console.error('❌ [Personas] Failed to get usage stats:', error);
      throw new Error('Failed to get usage stats');
    }
  }

  /**
   * Map database row to Persona object
   */
  private mapRowToPersona(row: any): Persona {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      stylePresetId: row.style_preset_id,
      colorScheme: row.color_scheme,
      aiProvider: row.ai_provider,
      toneGuidelines: row.tone_guidelines,
      scriptTemplate: row.script_template,
      targetAudience: row.target_audience,
      defaultVideoLengthSeconds: row.default_video_length_seconds,
      scenesPerVideo: row.scenes_per_video,
      pacingStyle: row.pacing_style,
      musicGenre: row.music_genre,
      voiceStyle: row.voice_style,
      jobsCreatedCount: row.jobs_created_count,
      isActive: row.is_active,
      isSystemPreset: row.is_system_preset,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastUsedAt: row.last_used_at,
    };
  }
}

// Singleton instance for global use
export const personaManager = new PersonaManager();

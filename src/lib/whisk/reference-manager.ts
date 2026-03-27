/**
 * Reference Images Manager
 *
 * Centralized module for managing Whisk API reference images.
 * Handles hierarchical reference resolution (scene-specific → style preset → defaults).
 *
 * MODULAR DESIGN: Supports multiple content formats (news, podcasts, shorts, etc.)
 *
 * @module reference-manager
 */

import { db } from '../db';
import { WhiskReferenceImages } from './types';

/**
 * Reference strategy types
 */
export type ReferenceStrategy =
  | 'style_only'    // Use only style preset references
  | 'scene_based'   // Use only scene-specific references
  | 'adaptive'      // Merge scene + preset (scene overrides)
  | 'none';         // No references

/**
 * Scene reference data from database
 */
export interface SceneReferences {
  style?: string;
  subject?: string;
  scene?: string;
}

/**
 * Style preset reference data
 */
export interface StylePresetReferences {
  strategy: ReferenceStrategy;
  referenceUrls: string[];
}

/**
 * Reference resolution result
 */
export interface ReferenceResolution {
  references: WhiskReferenceImages | undefined;
  strategy: ReferenceStrategy;
  source: 'scene' | 'preset' | 'merged' | 'none';
  appliedReferences: string[]; // List of reference types used
}

/**
 * Reference Images Manager
 *
 * Provides clean, testable API for reference resolution.
 */
export class ReferenceImagesManager {

  /**
   * Fetch scene-specific reference images from database
   */
  async fetchSceneReferences(sceneId: string): Promise<SceneReferences> {
    const result = await db.query(
      'SELECT reference_images FROM news_scenes WHERE id = $1',
      [sceneId]
    );

    const referenceImages = result.rows[0]?.reference_images || {};

    return {
      style: referenceImages.style,
      subject: referenceImages.subject,
      scene: referenceImages.scene,
    };
  }

  /**
   * Fetch style preset reference configuration
   */
  async fetchStylePresetReferences(presetId: string): Promise<StylePresetReferences | null> {
    const result = await db.query(
      'SELECT reference_strategy, reference_image_urls FROM style_presets WHERE id = $1',
      [presetId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return {
      strategy: (result.rows[0].reference_strategy as ReferenceStrategy) || 'style_only',
      referenceUrls: result.rows[0].reference_image_urls || [],
    };
  }

  /**
   * Resolve references using hierarchical strategy
   *
   * @param sceneId - Scene UUID
   * @param stylePresetId - Optional style preset UUID
   * @returns Resolved reference images for Whisk API
   */
  async resolveReferences(
    sceneId: string,
    stylePresetId?: string
  ): Promise<ReferenceResolution> {
    // Fetch scene-specific references
    const sceneRefs = await this.fetchSceneReferences(sceneId);

    // Fetch style preset references if preset exists
    let presetRefs: StylePresetReferences | null = null;
    if (stylePresetId) {
      presetRefs = await this.fetchStylePresetReferences(stylePresetId);
    }

    // Determine strategy (default to style_only)
    const strategy: ReferenceStrategy = presetRefs?.strategy || 'style_only';

    // Apply strategy
    return this.applyStrategy(strategy, sceneRefs, presetRefs);
  }

  /**
   * Apply reference resolution strategy
   */
  private applyStrategy(
    strategy: ReferenceStrategy,
    sceneRefs: SceneReferences,
    presetRefs: StylePresetReferences | null
  ): ReferenceResolution {

    switch (strategy) {
      case 'style_only':
        return this.applyStyleOnlyStrategy(presetRefs);

      case 'scene_based':
        return this.applySceneBasedStrategy(sceneRefs);

      case 'adaptive':
        return this.applyAdaptiveStrategy(sceneRefs, presetRefs);

      case 'none':
        return {
          references: undefined,
          strategy: 'none',
          source: 'none',
          appliedReferences: [],
        };

      default:
        console.warn(`⚠️  [RefManager] Unknown strategy: ${strategy}, using no references`);
        return {
          references: undefined,
          strategy: 'none',
          source: 'none',
          appliedReferences: [],
        };
    }
  }

  /**
   * STYLE_ONLY: Use only style preset references
   */
  private applyStyleOnlyStrategy(
    presetRefs: StylePresetReferences | null
  ): ReferenceResolution {
    if (!presetRefs || presetRefs.referenceUrls.length === 0) {
      return {
        references: undefined,
        strategy: 'style_only',
        source: 'none',
        appliedReferences: [],
      };
    }

    return {
      references: {
        style: presetRefs.referenceUrls[0], // Use first URL as style guide
      },
      strategy: 'style_only',
      source: 'preset',
      appliedReferences: ['style'],
    };
  }

  /**
   * SCENE_BASED: Use only scene-specific references
   * Priority: style > subject > scene
   */
  private applySceneBasedStrategy(
    sceneRefs: SceneReferences
  ): ReferenceResolution {
    // Priority order: style > subject > scene
    if (sceneRefs.style) {
      return {
        references: { style: sceneRefs.style },
        strategy: 'scene_based',
        source: 'scene',
        appliedReferences: ['style'],
      };
    }

    if (sceneRefs.subject) {
      return {
        references: { subject: sceneRefs.subject },
        strategy: 'scene_based',
        source: 'scene',
        appliedReferences: ['subject'],
      };
    }

    if (sceneRefs.scene) {
      return {
        references: { scene: sceneRefs.scene },
        strategy: 'scene_based',
        source: 'scene',
        appliedReferences: ['scene'],
      };
    }

    // No scene references found
    return {
      references: undefined,
      strategy: 'scene_based',
      source: 'none',
      appliedReferences: [],
    };
  }

  /**
   * ADAPTIVE: Merge scene-specific WITH style preset
   * Scene-specific references OVERRIDE preset for same type
   */
  private applyAdaptiveStrategy(
    sceneRefs: SceneReferences,
    presetRefs: StylePresetReferences | null
  ): ReferenceResolution {
    const merged: WhiskReferenceImages = {};
    const appliedReferences: string[] = [];

    // Start with style preset reference
    if (presetRefs && presetRefs.referenceUrls.length > 0) {
      merged.style = presetRefs.referenceUrls[0];
      appliedReferences.push('style (preset)');
    }

    // Override/augment with scene-specific references
    if (sceneRefs.style) {
      merged.style = sceneRefs.style; // Scene overrides preset
      appliedReferences.push('style (scene override)');
    }

    if (sceneRefs.subject) {
      merged.subject = sceneRefs.subject;
      appliedReferences.push('subject');
    }

    if (sceneRefs.scene) {
      merged.scene = sceneRefs.scene;
      appliedReferences.push('scene');
    }

    // Return undefined if no references found
    if (Object.keys(merged).length === 0) {
      return {
        references: undefined,
        strategy: 'adaptive',
        source: 'none',
        appliedReferences: [],
      };
    }

    return {
      references: merged,
      strategy: 'adaptive',
      source: 'merged',
      appliedReferences,
    };
  }

  /**
   * Validate reference image paths exist
   *
   * @param references - Reference images object
   * @returns Promise<boolean> - true if all paths valid
   */
  async validateReferences(references: WhiskReferenceImages | undefined): Promise<boolean> {
    if (!references) return true; // No references is valid

    const paths = Object.values(references);

    // Basic validation: check if paths are non-empty strings
    for (const path of paths) {
      if (!path || typeof path !== 'string' || path.trim().length === 0) {
        console.warn(`⚠️  [RefManager] Invalid reference path: ${path}`);
        return false;
      }
    }

    // TODO: Add filesystem validation if needed (fs.existsSync)
    // Currently Whisk API accepts HTTP URLs and local paths

    return true;
  }
}

// Singleton instance for global use
export const referenceManager = new ReferenceImagesManager();

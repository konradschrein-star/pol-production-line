/**
 * Reference Images Manager Tests
 *
 * Unit tests for the modular reference images resolution system.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReferenceImagesManager } from '@/lib/whisk/reference-manager';
import type { ReferenceStrategy } from '@/lib/whisk/reference-manager';

// Mock database
vi.mock('@/lib/db', () => ({
  db: {
    query: vi.fn(),
  },
}));

import { db } from '@/lib/db';

describe('ReferenceImagesManager', () => {
  let manager: ReferenceImagesManager;

  beforeEach(() => {
    manager = new ReferenceImagesManager();
    vi.clearAllMocks();
  });

  describe('fetchSceneReferences', () => {
    it('should fetch scene-specific references from database', async () => {
      const mockSceneId = 'scene-123';
      const mockRefs = {
        style: 'https://example.com/style.jpg',
        subject: 'https://example.com/subject.jpg',
      };

      (db.query as any).mockResolvedValueOnce({
        rows: [{ reference_images: mockRefs }],
      });

      const result = await manager.fetchSceneReferences(mockSceneId);

      expect(result).toEqual({
        style: mockRefs.style,
        subject: mockRefs.subject,
        scene: undefined,
      });
      expect(db.query).toHaveBeenCalledWith(
        'SELECT reference_images FROM news_scenes WHERE id = $1',
        [mockSceneId]
      );
    });

    it('should return empty object if no references found', async () => {
      (db.query as any).mockResolvedValueOnce({ rows: [{}] });

      const result = await manager.fetchSceneReferences('scene-456');

      expect(result).toEqual({
        style: undefined,
        subject: undefined,
        scene: undefined,
      });
    });
  });

  describe('applyStrategy - style_only', () => {
    it('should use only preset references', async () => {
      const mockPresetRefs = {
        strategy: 'style_only' as ReferenceStrategy,
        referenceUrls: ['https://preset.com/style.jpg'],
      };

      const result = (manager as any).applyStyleOnlyStrategy(mockPresetRefs);

      expect(result).toEqual({
        references: {
          style: 'https://preset.com/style.jpg',
        },
        strategy: 'style_only',
        source: 'preset',
        appliedReferences: ['style'],
      });
    });

    it('should return undefined if no preset references', async () => {
      const result = (manager as any).applyStyleOnlyStrategy(null);

      expect(result.references).toBeUndefined();
      expect(result.source).toBe('none');
    });
  });

  describe('applyStrategy - scene_based', () => {
    it('should prioritize style > subject > scene', () => {
      const mockSceneRefs = {
        style: 'https://scene.com/style.jpg',
        subject: 'https://scene.com/subject.jpg',
        scene: 'https://scene.com/scene.jpg',
      };

      const result = (manager as any).applySceneBasedStrategy(mockSceneRefs);

      expect(result.references).toEqual({
        style: 'https://scene.com/style.jpg',
      });
      expect(result.source).toBe('scene');
    });

    it('should use subject if no style', () => {
      const mockSceneRefs = {
        subject: 'https://scene.com/subject.jpg',
      };

      const result = (manager as any).applySceneBasedStrategy(mockSceneRefs);

      expect(result.references).toEqual({
        subject: 'https://scene.com/subject.jpg',
      });
    });

    it('should return undefined if no scene references', () => {
      const result = (manager as any).applySceneBasedStrategy({});

      expect(result.references).toBeUndefined();
      expect(result.source).toBe('none');
    });
  });

  describe('applyStrategy - adaptive', () => {
    it('should merge preset and scene references', () => {
      const mockSceneRefs = {
        subject: 'https://scene.com/subject.jpg',
      };
      const mockPresetRefs = {
        strategy: 'adaptive' as ReferenceStrategy,
        referenceUrls: ['https://preset.com/style.jpg'],
      };

      const result = (manager as any).applyAdaptiveStrategy(
        mockSceneRefs,
        mockPresetRefs
      );

      expect(result.references).toEqual({
        style: 'https://preset.com/style.jpg',
        subject: 'https://scene.com/subject.jpg',
      });
      expect(result.source).toBe('merged');
    });

    it('should allow scene style to override preset style', () => {
      const mockSceneRefs = {
        style: 'https://scene.com/style-override.jpg',
      };
      const mockPresetRefs = {
        strategy: 'adaptive' as ReferenceStrategy,
        referenceUrls: ['https://preset.com/style.jpg'],
      };

      const result = (manager as any).applyAdaptiveStrategy(
        mockSceneRefs,
        mockPresetRefs
      );

      expect(result.references?.style).toBe('https://scene.com/style-override.jpg');
    });
  });

  describe('validateReferences', () => {
    it('should return true for valid references', async () => {
      const validRefs = {
        style: 'https://example.com/style.jpg',
        subject: 'C:\\path\\to\\subject.jpg',
      };

      const result = await manager.validateReferences(validRefs);

      expect(result).toBe(true);
    });

    it('should return false for invalid references', async () => {
      const invalidRefs = {
        style: '',
        subject: 'https://example.com/subject.jpg',
      };

      const result = await manager.validateReferences(invalidRefs);

      expect(result).toBe(false);
    });

    it('should return true for undefined references', async () => {
      const result = await manager.validateReferences(undefined);

      expect(result).toBe(true);
    });
  });
});

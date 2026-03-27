/**
 * Style Presets API Integration Tests
 *
 * Tests for /api/style-presets CRUD operations.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('Style Presets API', () => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8347';
  let createdPresetId: string | null = null;

  describe('GET /api/style-presets', () => {
    it('should fetch all style presets', async () => {
      const response = await fetch(`${baseUrl}/api/style-presets`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('presets');
      expect(Array.isArray(data.presets)).toBe(true);
    });
  });

  describe('POST /api/style-presets', () => {
    it('should create a new style preset', async () => {
      const newPreset = {
        name: 'Test Preset ' + Date.now(),
        description: 'Automated test preset',
        reference_strategy: 'style_only',
        visual_guidelines: 'Test visual guidelines',
        prompt_prefix: 'cinematic',
      };

      const response = await fetch(`${baseUrl}/api/style-presets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPreset),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
      expect(data.preset).toHaveProperty('id');
      expect(data.preset.name).toBe(newPreset.name);
      expect(data.preset.description).toBe(newPreset.description);

      // Store for cleanup
      createdPresetId = data.preset.id;
    });

    it('should reject preset without name', async () => {
      const invalidPreset = {
        description: 'No name preset',
      };

      const response = await fetch(`${baseUrl}/api/style-presets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPreset),
      });

      expect(response.status).toBe(400);
    });

    it('should reject preset with short name', async () => {
      const invalidPreset = {
        name: 'AB', // Too short
      };

      const response = await fetch(`${baseUrl}/api/style-presets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPreset),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /api/style-presets', () => {
    it('should update existing preset', async () => {
      if (!createdPresetId) {
        throw new Error('No preset created for update test');
      }

      const updates = {
        id: createdPresetId,
        description: 'Updated description via test',
        prompt_suffix: 'high quality',
      };

      const response = await fetch(`${baseUrl}/api/style-presets`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
      expect(data.preset.description).toBe(updates.description);
      expect(data.preset.prompt_suffix).toBe(updates.prompt_suffix);
    });

    it('should reject update without ID', async () => {
      const response = await fetch(`${baseUrl}/api/style-presets`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'No ID' }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/style-presets', () => {
    it('should delete custom preset', async () => {
      if (!createdPresetId) {
        throw new Error('No preset created for delete test');
      }

      const response = await fetch(
        `${baseUrl}/api/style-presets?id=${createdPresetId}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);

      // Cleanup complete
      createdPresetId = null;
    });

    it('should reject delete without ID', async () => {
      const response = await fetch(`${baseUrl}/api/style-presets`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(400);
    });
  });

  // Cleanup in case tests failed
  afterAll(async () => {
    if (createdPresetId) {
      await fetch(`${baseUrl}/api/style-presets?id=${createdPresetId}`, {
        method: 'DELETE',
      });
    }
  });
});

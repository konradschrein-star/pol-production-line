/**
 * Whisk API Client Test Suite
 *
 * Tests direct API integration with Google Whisk for image generation.
 * Critical for 15-20 minute image generation phase.
 *
 * Priority: CRITICAL
 * Coverage Target: 85%+
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WhiskAPIClient } from '@/lib/whisk/api';
import { generateImageWithRetry } from '@/lib/whisk/generate-with-retry';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

// Helper to create mock responses in correct Whisk API format
function createWhiskResponse(images: Array<{ url?: string; imageUrl?: string; base64?: string | null; encodedImage?: string }> = []) {
  return {
    data: {
      imagePanels: [
        {
          generatedImages: images.map(img => ({
            imageUrl: img.imageUrl || img.url || '',
            encodedImage: img.encodedImage || img.base64 || '',
          })),
        },
      ],
    },
  };
}

describe('Whisk API Client', () => {
  const validToken = 'ya29.a0ATkoCc_test_token_123';
  const apiUrl = 'https://aisandbox-pa.googleapis.com/v1/whisk:generateImage';

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Set test token
    process.env.WHISK_API_TOKEN = validToken;
    process.env.WHISK_TOKEN_REFRESH_ENABLED = 'false'; // Disable auto-refresh for tests
  });

  afterEach(() => {
    // Cleanup
    delete process.env.WHISK_API_TOKEN;
    delete process.env.WHISK_TOKEN_REFRESH_ENABLED;
  });

  describe('Constructor', () => {
    it('should initialize with token from environment', () => {
      const client = new WhiskAPIClient();
      expect(client).toBeInstanceOf(WhiskAPIClient);
    });

    it('should initialize with token from parameter', () => {
      const customToken = 'ya29.custom_token';
      const client = new WhiskAPIClient(customToken);
      expect(client).toBeInstanceOf(WhiskAPIClient);
    });

    it('should throw error if no token provided', () => {
      delete process.env.WHISK_API_TOKEN;

      expect(() => new WhiskAPIClient()).toThrow('WHISK_API_TOKEN not set');
    });
  });

  describe('generateImage', () => {
    it('should generate image successfully with minimal options', async () => {
      const mockResponse = createWhiskResponse([
        { url: 'https://example.com/image.jpg', base64: null },
      ]);

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const client = new WhiskAPIClient(validToken);
      const result = await client.generateImage({
        prompt: 'A news broadcast studio',
      });

      expect(result.images).toHaveLength(1);
      expect(result.images[0].url).toBe('https://example.com/image.jpg');

      // Verify API call
      expect(mockedAxios.post).toHaveBeenCalledWith(
        apiUrl,
        expect.objectContaining({
          prompt: 'A news broadcast studio',
        }),
        expect.objectContaining({
          headers: {
            Authorization: `Bearer ${validToken}`,
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should generate image with aspect ratio', async () => {
      const mockResponse = createWhiskResponse([{ url: 'https://example.com/image.jpg' }]);

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const client = new WhiskAPIClient(validToken);
      await client.generateImage({
        prompt: 'A landscape scene',
        aspectRatio: 'IMAGE_ASPECT_RATIO_LANDSCAPE',
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        apiUrl,
        expect.objectContaining({
          aspectRatio: 'IMAGE_ASPECT_RATIO_LANDSCAPE',
        }),
        expect.any(Object)
      );
    });

    it('should generate image with reference images', async () => {
      const mockResponse = createWhiskResponse([{ url: 'https://example.com/image.jpg' }]);

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const client = new WhiskAPIClient(validToken);
      await client.generateImage({
        prompt: 'A news studio',
        referenceImages: {
          styleImage: 'https://example.com/style.jpg',
          subjectImage: 'https://example.com/subject.jpg',
        },
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        apiUrl,
        expect.objectContaining({
          referenceImages: {
            styleImage: 'https://example.com/style.jpg',
            subjectImage: 'https://example.com/subject.jpg',
          },
        }),
        expect.any(Object)
      );
    });

    it('should handle base64 image response', async () => {
      const mockResponse = createWhiskResponse([
        {
          url: null,
          base64: '/9j/4AAQSkZJRg==',
        },
      ]);

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const client = new WhiskAPIClient(validToken);
      const result = await client.generateImage({
        prompt: 'Test image',
      });

      expect(result.images[0].base64).toBe('/9j/4AAQSkZJRg==');
      expect(result.images[0].url).toBeNull();
    });

    it('should handle multiple images in response', async () => {
      const mockResponse = createWhiskResponse([
        { url: 'https://example.com/image1.jpg' },
        { url: 'https://example.com/image2.jpg' },
        { url: 'https://example.com/image3.jpg' },
      ]);

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const client = new WhiskAPIClient(validToken);
      const result = await client.generateImage({
        prompt: 'Test images',
        numImages: 3,
      });

      expect(result.images).toHaveLength(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle 401 unauthorized (token expired)', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          status: 401,
          data: { error: 'Invalid authentication credentials' },
        },
      });

      const client = new WhiskAPIClient(validToken);

      await expect(
        client.generateImage({ prompt: 'Test' })
      ).rejects.toThrow();
    });

    it('should handle 429 rate limiting', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          status: 429,
          data: { error: 'Rate limit exceeded' },
        },
      });

      const client = new WhiskAPIClient(validToken);

      await expect(
        client.generateImage({ prompt: 'Test' })
      ).rejects.toThrow();
    });

    it('should handle 400 content policy violation', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: { error: 'Content policy violation' },
        },
      });

      const client = new WhiskAPIClient(validToken);

      await expect(
        client.generateImage({ prompt: 'Inappropriate content' })
      ).rejects.toThrow();
    });

    it('should handle 500 internal server error', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          status: 500,
          data: { error: 'Internal server error' },
        },
      });

      const client = new WhiskAPIClient(validToken);

      await expect(
        client.generateImage({ prompt: 'Test' })
      ).rejects.toThrow();
    });

    it('should handle network timeout', async () => {
      mockedAxios.post.mockRejectedValueOnce(
        Object.assign(new Error('Network timeout'), { code: 'ETIMEDOUT' })
      );

      const client = new WhiskAPIClient(validToken);

      await expect(
        client.generateImage({ prompt: 'Test' })
      ).rejects.toThrow('Network timeout');
    });

    it('should handle malformed API response', async () => {
      const mockResponse = {
        data: {
          // Missing 'images' field
          result: 'success',
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const client = new WhiskAPIClient(validToken);

      await expect(
        client.generateImage({ prompt: 'Test' })
      ).rejects.toThrow();
    });

    it('should handle empty images array', async () => {
      const mockResponse = createWhiskResponse([]); // Empty array

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const client = new WhiskAPIClient(validToken);

      await expect(
        client.generateImage({ prompt: 'Test' })
      ).rejects.toThrow();
    });
  });

  describe('Prompt Validation', () => {
    it('should handle empty prompt', async () => {
      const client = new WhiskAPIClient(validToken);

      await expect(
        client.generateImage({ prompt: '' })
      ).rejects.toThrow();
    });

    it('should handle very long prompt (>5000 characters)', async () => {
      const longPrompt = 'x'.repeat(6000);

      mockedAxios.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: { error: 'Prompt too long' },
        },
      });

      const client = new WhiskAPIClient(validToken);

      await expect(
        client.generateImage({ prompt: longPrompt })
      ).rejects.toThrow();
    });

    it('should handle Unicode characters in prompt', async () => {
      const mockResponse = createWhiskResponse([{ url: 'https://example.com/image.jpg' }]);

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const client = new WhiskAPIClient(validToken);
      const result = await client.generateImage({
        prompt: 'A 新闻 broadcast 🎥',
      });

      expect(result.images).toHaveLength(1);
    });

    it('should handle special characters in prompt', async () => {
      const mockResponse = createWhiskResponse([{ url: 'https://example.com/image.jpg' }]);

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const client = new WhiskAPIClient(validToken);
      const result = await client.generateImage({
        prompt: 'A news studio with "quotes" & symbols: @#$%',
      });

      expect(result.images).toHaveLength(1);
    });
  });
});

describe('Generate Image with Retry', () => {
  const validToken = 'ya29.a0ATkoCc_test_token_123';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WHISK_API_TOKEN = validToken;
    process.env.WHISK_TOKEN_REFRESH_ENABLED = 'false';
  });

  afterEach(() => {
    delete process.env.WHISK_API_TOKEN;
    delete process.env.WHISK_TOKEN_REFRESH_ENABLED;
  });

  describe('Retry Logic', () => {
    it('should succeed on first attempt', async () => {
      const mockResponse = createWhiskResponse([{ url: 'https://example.com/image.jpg' }]);

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await generateImageWithRetry('A news studio');

      expect(result.success).toBe(true);
      expect(result.totalAttempts).toBe(1);
      expect(result.finalImageUrl).toBe('https://example.com/image.jpg');
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });

    it('should retry on content policy violation', async () => {
      // First attempt fails (content policy)
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: { error: 'Content policy violation' },
        },
      });

      // Second attempt succeeds
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          images: [{ url: 'https://example.com/image.jpg' }],
        },
      });

      const result = await generateImageWithRetry('Sensitive content');

      expect(result.success).toBe(true);
      expect(result.totalAttempts).toBe(2);
      expect(result.attempts).toHaveLength(2);
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    it('should respect maxAttempts limit', async () => {
      // All attempts fail
      mockedAxios.post.mockRejectedValue({
        response: {
          status: 500,
          data: { error: 'Internal server error' },
        },
      });

      const result = await generateImageWithRetry('Test', { maxAttempts: 3 });

      expect(result.success).toBe(false);
      expect(result.totalAttempts).toBe(3);
      expect(mockedAxios.post).toHaveBeenCalledTimes(3);
    });

    it('should track generation time for each attempt', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          images: [{ url: 'https://example.com/image.jpg' }],
        },
      });

      const result = await generateImageWithRetry('Test');

      expect(result.success).toBe(true);
      expect(result.attempts[0].generationTimeMs).toBeGreaterThan(0);
      expect(result.totalTimeMs).toBeGreaterThan(0);
    });

    it('should call onAttempt callback for each attempt', async () => {
      const onAttemptMock = vi.fn();

      // First fails, second succeeds
      mockedAxios.post.mockRejectedValueOnce({
        response: { status: 400 },
      });
      mockedAxios.post.mockResolvedValueOnce({
        data: { imagePanels: [{ generatedImages: [{ imageUrl: 'https://example.com/image.jpg', encodedImage: '' }] }] },
      });

      await generateImageWithRetry('Test', { onAttempt: onAttemptMock });

      expect(onAttemptMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('Prompt Adjustment', () => {
    it('should sanitize prompt on retry', async () => {
      // First attempt fails
      mockedAxios.post.mockRejectedValueOnce({
        response: { status: 400, data: { error: 'Content policy violation' } },
      });

      // Second attempt with adjusted prompt succeeds
      mockedAxios.post.mockResolvedValueOnce({
        data: { imagePanels: [{ generatedImages: [{ imageUrl: 'https://example.com/image.jpg', encodedImage: '' }] }] },
      });

      const result = await generateImageWithRetry('Violent scene');

      expect(result.success).toBe(true);
      expect(result.totalAttempts).toBe(2);

      // Verify second call had different (sanitized) prompt
      const firstCall = mockedAxios.post.mock.calls[0];
      const secondCall = mockedAxios.post.mock.calls[1];

      expect(firstCall[1].prompt).not.toBe(secondCall[1].prompt);
    });

    it('should progressively simplify prompt across attempts', async () => {
      const attemptedPrompts: string[] = [];

      mockedAxios.post.mockImplementation(async (url, data) => {
        attemptedPrompts.push(data.prompt);

        // Fail first 2 attempts, succeed on 3rd
        if (attemptedPrompts.length < 3) {
          throw {
            response: { status: 400, data: { error: 'Failed' } },
          };
        }

        return {
          data: { imagePanels: [{ generatedImages: [{ imageUrl: 'https://example.com/image.jpg', encodedImage: '' }] }] },
        };
      });

      const result = await generateImageWithRetry(
        'A highly detailed, photorealistic news broadcast studio'
      );

      expect(result.success).toBe(true);
      expect(result.totalAttempts).toBe(3);

      // Verify prompts got progressively simpler
      expect(attemptedPrompts[1].length).toBeLessThan(attemptedPrompts[0].length);
      expect(attemptedPrompts[2].length).toBeLessThan(attemptedPrompts[1].length);
    });
  });

  describe('Edge Cases', () => {
    it('should handle all attempts failing', async () => {
      mockedAxios.post.mockRejectedValue({
        response: { status: 500, data: { error: 'Server error' } },
      });

      const result = await generateImageWithRetry('Test', { maxAttempts: 3 });

      expect(result.success).toBe(false);
      expect(result.finalImageUrl).toBeUndefined();
      expect(result.totalAttempts).toBe(3);
    });

    it('should handle malformed response after retries', async () => {
      // All attempts return malformed response
      mockedAxios.post.mockResolvedValue({
        data: { imagePanels: [{ generatedImages: [] }] }, // Empty images array
      });

      const result = await generateImageWithRetry('Test', { maxAttempts: 2 });

      expect(result.success).toBe(false);
    });

    it('should handle network errors', async () => {
      mockedAxios.post.mockRejectedValue(
        Object.assign(new Error('Network error'), { code: 'ECONNRESET' })
      );

      const result = await generateImageWithRetry('Test', { maxAttempts: 2 });

      expect(result.success).toBe(false);
      expect(result.totalAttempts).toBe(2);
    });
  });
});

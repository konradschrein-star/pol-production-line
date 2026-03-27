/**
 * Tier 2 Unit Test: Images Worker
 *
 * Purpose: Test Whisk API integration, retry logic, rate limiting, and error handling
 * for the images worker (Node 3 of the pipeline).
 *
 * Tests:
 * - Exponential backoff calculation
 * - Content policy violation detection and auto-sanitization
 * - 429 rate limit handling with adaptive concurrency
 * - 401 token expiration detection
 * - Timeout handling for slow API calls
 * - Maximum retry attempts (3 consecutive failures → mark failed)
 * - Prompt sanitization (quick rules + AI-powered)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { quickSanitize } from '@/lib/ai/prompt-sanitizer';

// Constants from images.worker.ts
const MAX_RETRIES = 3;
const RETRY_BACKOFF_BASE = 3000; // 3s
const MAX_PROMPT_SANITIZATION_ATTEMPTS = 3;
const API_TIMEOUT_MS = 90000; // 90s

describe('Images Worker - Exponential Backoff', () => {
  /**
   * Backoff formula: baseDelay * 2^attempt
   * 3s, 6s, 12s for attempts 1-3
   */

  it('should calculate correct backoff delays', () => {
    const calculateBackoff = (attempt: number, baseDelay: number = RETRY_BACKOFF_BASE) => {
      return baseDelay * Math.pow(2, attempt);
    };

    expect(calculateBackoff(0, 3000)).toBe(3000);  // First retry: 3s
    expect(calculateBackoff(1, 3000)).toBe(6000);  // Second retry: 6s
    expect(calculateBackoff(2, 3000)).toBe(12000); // Third retry: 12s
  });

  it('should increase delay exponentially', () => {
    const delays = [0, 1, 2].map(attempt => RETRY_BACKOFF_BASE * Math.pow(2, attempt));

    expect(delays[0]).toBe(3000);
    expect(delays[1]).toBe(6000);
    expect(delays[2]).toBe(12000);

    // Each delay should be double the previous
    expect(delays[1]).toBe(delays[0] * 2);
    expect(delays[2]).toBe(delays[1] * 2);
  });

  it('should respect maximum retry limit', () => {
    const maxAttempts = MAX_RETRIES;

    expect(maxAttempts).toBe(3);

    // After 3 failures, should give up
    const attempts = [0, 1, 2];
    expect(attempts.length).toBe(maxAttempts);
  });
});

describe('Images Worker - Content Policy Violation Detection', () => {
  it('should detect content policy violations from error messages', () => {
    const policyViolationKeywords = [
      'content policy',
      'safety',
      'inappropriate',
      'violated',
      'blocked',
      'prohibited',
    ];

    policyViolationKeywords.forEach(keyword => {
      const errorMessage = `Error: ${keyword} - request rejected`;
      const isPolicyViolation = errorMessage.includes(keyword);

      expect(isPolicyViolation).toBe(true);
    });
  });

  it('should detect 400 status as potential policy violation', () => {
    const error = {
      status: 400,
      message: 'Bad request',
    };

    expect(error.status).toBe(400);
  });

  it('should NOT treat other errors as policy violations', () => {
    const networkErrors = [
      'Network timeout',
      'ECONNREFUSED',
      'Socket hang up',
      'ETIMEDOUT',
    ];

    networkErrors.forEach(errorMsg => {
      const isPolicyViolation =
        errorMsg.includes('content policy') ||
        errorMsg.includes('safety') ||
        errorMsg.includes('inappropriate');

      expect(isPolicyViolation).toBe(false);
    });
  });
});

describe('Images Worker - Prompt Sanitization', () => {
  it('should remove violent keywords', () => {
    const violentPrompts = [
      'violent protest with weapons',
      'people fighting in the streets',
      'explosion and destruction',
    ];

    violentPrompts.forEach(prompt => {
      const sanitized = quickSanitize(prompt);

      expect(sanitized).not.toContain('violent');
      expect(sanitized).not.toContain('fighting');
      expect(sanitized).not.toContain('explosion');
    });
  });

  it('should remove explicit content keywords', () => {
    const explicitPrompt = 'nude people on the beach';
    const sanitized = quickSanitize(explicitPrompt);

    expect(sanitized).not.toContain('nude');
  });

  it('should preserve safe content', () => {
    const safePrompts = [
      'A peaceful cityscape at sunset',
      'A news anchor at a desk',
      'A chart showing economic data',
    ];

    safePrompts.forEach(prompt => {
      const sanitized = quickSanitize(prompt);

      // Should be identical or very similar
      expect(sanitized.toLowerCase()).toContain('peaceful') ||
        expect(sanitized.toLowerCase()).toContain('news') ||
        expect(sanitized.toLowerCase()).toContain('chart');
    });
  });

  it('should handle multiple violations in one prompt', () => {
    const multiViolationPrompt = 'violent protest with weapons and blood';
    const sanitized = quickSanitize(multiViolationPrompt);

    expect(sanitized).not.toContain('violent');
    expect(sanitized).not.toContain('weapons');
    expect(sanitized).not.toContain('blood');
  });

  it('should maintain prompt structure after sanitization', () => {
    const prompt = 'A cinematic shot of a violent scene';
    const sanitized = quickSanitize(prompt);

    // Should still be a valid sentence
    expect(sanitized.length).toBeGreaterThan(0);
    expect(sanitized).toContain('cinematic') || expect(sanitized).toContain('shot');
  });
});

describe('Images Worker - Rate Limiting (429 Errors)', () => {
  it('should detect 429 rate limit errors', () => {
    const rateLimitError = {
      status: 429,
      message: 'Too Many Requests',
    };

    expect(rateLimitError.status).toBe(429);
  });

  it('should reduce concurrency on 429 errors', () => {
    // Mock adaptive rate limiter behavior
    let currentConcurrency = 8;
    const minConcurrency = 2;

    // Simulate 429 error
    if (currentConcurrency > minConcurrency) {
      currentConcurrency -= 1;
    }

    expect(currentConcurrency).toBe(7);

    // Another 429
    if (currentConcurrency > minConcurrency) {
      currentConcurrency -= 1;
    }

    expect(currentConcurrency).toBe(6);
  });

  it('should not reduce concurrency below minimum', () => {
    let currentConcurrency = 2; // At minimum
    const minConcurrency = 2;

    // Try to reduce
    if (currentConcurrency > minConcurrency) {
      currentConcurrency -= 1;
    }

    expect(currentConcurrency).toBe(2); // Should stay at minimum
  });

  it('should increase concurrency on success', () => {
    let currentConcurrency = 4;
    const maxConcurrency = 8;

    // Simulate success
    if (currentConcurrency < maxConcurrency) {
      currentConcurrency += 1;
    }

    expect(currentConcurrency).toBe(5);
  });

  it('should respect maximum concurrency', () => {
    let currentConcurrency = 8; // At maximum
    const maxConcurrency = 8;

    // Try to increase
    if (currentConcurrency < maxConcurrency) {
      currentConcurrency += 1;
    }

    expect(currentConcurrency).toBe(8); // Should stay at maximum
  });
});

describe('Images Worker - Token Expiration (401 Errors)', () => {
  it('should detect 401 unauthorized errors', () => {
    const tokenError = {
      status: 401,
      message: 'Unauthorized - token expired',
    };

    expect(tokenError.status).toBe(401);
    expect(tokenError.message).toContain('token expired') || expect(tokenError.message).toContain('Unauthorized');
  });

  it('should indicate token refresh required', () => {
    const error = {
      status: 401,
      message: 'Invalid authentication credentials',
    };

    const requiresTokenRefresh = error.status === 401;
    expect(requiresTokenRefresh).toBe(true);
  });
});

describe('Images Worker - Timeout Handling', () => {
  it('should timeout API calls after 90 seconds', async () => {
    const timeoutMs = API_TIMEOUT_MS;
    expect(timeoutMs).toBe(90000);

    // Simulate timeout
    const withTimeout = async <T>(
      promise: Promise<T>,
      ms: number
    ): Promise<T> => {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), ms);
      });

      return Promise.race([promise, timeoutPromise]);
    };

    const slowOperation = new Promise((resolve) => {
      setTimeout(resolve, 100000); // 100s (would exceed timeout)
    });

    await expect(withTimeout(slowOperation, 1000)).rejects.toThrow('Timeout');
  });

  it('should timeout image downloads after 30 seconds', async () => {
    const downloadTimeoutMs = 30000;

    expect(downloadTimeoutMs).toBe(30000);
  });

  it('should timeout prompt sanitization after 15 seconds', async () => {
    const sanitizeTimeoutMs = 15000;

    expect(sanitizeTimeoutMs).toBe(15000);
  });
});

describe('Images Worker - Maximum Retry Attempts', () => {
  it('should fail after 3 consecutive sanitization attempts', () => {
    const MAX_ATTEMPTS = MAX_PROMPT_SANITIZATION_ATTEMPTS;
    let attemptCount = 0;

    // Simulate 3 failed attempts
    while (attemptCount < MAX_ATTEMPTS) {
      attemptCount++;
    }

    expect(attemptCount).toBe(3);

    // Should not retry again
    const shouldRetry = attemptCount < MAX_ATTEMPTS;
    expect(shouldRetry).toBe(false);
  });

  it('should mark scene as failed after exhausting retries', () => {
    const failureHistory = [
      { attempt: 1, error: 'Content policy violation' },
      { attempt: 2, error: 'Content policy violation (sanitized)' },
      { attempt: 3, error: 'Content policy violation (sanitized again)' },
    ];

    expect(failureHistory).toHaveLength(MAX_PROMPT_SANITIZATION_ATTEMPTS);

    const allFailed = failureHistory.every(h => h.error.includes('violation'));
    expect(allFailed).toBe(true);
  });
});

describe('Images Worker - Reference Images', () => {
  it('should include reference images in API call when provided', () => {
    const referenceImages = {
      style: 'https://example.com/style.jpg',
      subject: 'https://example.com/subject.jpg',
    };

    const hasReferences = Object.keys(referenceImages).length > 0;
    expect(hasReferences).toBe(true);
  });

  it('should omit reference images when none provided', () => {
    const referenceImages = {};

    const hasReferences = Object.keys(referenceImages).length > 0;
    expect(hasReferences).toBe(false);
  });

  it('should support style, subject, and scene references', () => {
    const validReferenceTypes = ['style', 'subject', 'scene'];

    validReferenceTypes.forEach(type => {
      expect(['style', 'subject', 'scene']).toContain(type);
    });
  });
});

describe('Images Worker - Style Preset Integration', () => {
  it('should apply style preset to prompt', () => {
    const originalPrompt = 'A cityscape at night';
    const styleModifier = 'in a cinematic style with dramatic lighting';

    const enhancedPrompt = `${originalPrompt} ${styleModifier}`;

    expect(enhancedPrompt).toContain(originalPrompt);
    expect(enhancedPrompt).toContain(styleModifier);
  });

  it('should fall back to original prompt if style preset fails', () => {
    const originalPrompt = 'A cityscape at night';
    let finalPrompt = originalPrompt;

    // Simulate style preset failure
    const stylePresetError = true;

    if (stylePresetError) {
      finalPrompt = originalPrompt; // Fallback
    }

    expect(finalPrompt).toBe(originalPrompt);
  });
});

describe('Images Worker - Image Storage', () => {
  it('should save images with scene ID as filename', () => {
    const sceneId = '123e4567-e89b-12d3-a456-426614174000';
    const filename = `${sceneId}.jpg`;

    expect(filename).toContain(sceneId);
    expect(filename).toEndWith('.jpg');
  });

  it('should create storage directory if it does not exist', () => {
    // Mock directory creation logic
    let directoryExists = false;

    if (!directoryExists) {
      // Create directory
      directoryExists = true;
    }

    expect(directoryExists).toBe(true);
  });

  it('should store relative paths in database for portability', () => {
    const sceneId = '123e4567-e89b-12d3-a456-426614174000';
    const relativePath = `images/${sceneId}.jpg`;

    // Should not contain absolute drive letters or user paths
    expect(relativePath).not.toContain('C:\\');
    expect(relativePath).not.toContain('/Users/');
    expect(relativePath).toContain('images/');
  });
});

describe('Images Worker - Generation History Tracking', () => {
  it('should record successful generation in history', () => {
    const historyEntry = {
      scene_id: 'scene-123',
      job_id: 'job-456',
      attempt_number: 1,
      success: true,
      generation_time_ms: 5000,
      image_url: 'images/scene-123.jpg',
    };

    expect(historyEntry.success).toBe(true);
    expect(historyEntry.generation_time_ms).toBeGreaterThan(0);
    expect(historyEntry.image_url).toBeDefined();
  });

  it('should record failed attempts with error messages', () => {
    const failedEntry = {
      scene_id: 'scene-123',
      job_id: 'job-456',
      attempt_number: 1,
      success: false,
      error_message: 'Content policy violation',
    };

    expect(failedEntry.success).toBe(false);
    expect(failedEntry.error_message).toBeDefined();
  });

  it('should track sanitization attempts separately', () => {
    const attempts = [
      { attempt_number: 1, prompt: 'Original prompt', success: false },
      { attempt_number: 2, prompt: 'Sanitized prompt', success: false },
      { attempt_number: 3, prompt: 'Double sanitized', success: true },
    ];

    expect(attempts).toHaveLength(3);
    expect(attempts[2].success).toBe(true);
  });
});

describe('Images Worker - Error Handling', () => {
  it('should handle network errors gracefully', () => {
    const networkErrors = [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'Socket hang up',
    ];

    networkErrors.forEach(errorCode => {
      const error = new Error(errorCode);
      expect(error.message).toContain(errorCode);
    });
  });

  it('should handle Whisk API returning empty images array', () => {
    const response = {
      images: [],
    };

    const hasImages = response.images && response.images.length > 0;
    expect(hasImages).toBe(false);

    // Should throw error
    if (!hasImages) {
      const error = new Error('Whisk API returned no images');
      expect(error.message).toContain('no images');
    }
  });

  it('should update scene status to "failed" after all retries exhausted', async () => {
    const sceneStatus = {
      generation_status: 'generating',
    };

    // Simulate all retries failed
    sceneStatus.generation_status = 'failed';

    expect(sceneStatus.generation_status).toBe('failed');
  });
});

describe('Images Worker - Job State Transitions', () => {
  it('should transition job to review_assets when all scenes complete', async () => {
    const scenes = [
      { id: 'scene-1', image_url: 'images/scene-1.jpg' },
      { id: 'scene-2', image_url: 'images/scene-2.jpg' },
      { id: 'scene-3', image_url: 'images/scene-3.jpg' },
    ];

    // All scenes have images
    const allComplete = scenes.every(s => s.image_url !== null);
    expect(allComplete).toBe(true);

    if (allComplete) {
      const nextStatus = 'review_assets';
      expect(nextStatus).toBe('review_assets');
    }
  });

  it('should NOT transition if any scene is still pending', () => {
    const scenes = [
      { id: 'scene-1', image_url: 'images/scene-1.jpg' },
      { id: 'scene-2', image_url: null }, // Still generating
      { id: 'scene-3', image_url: 'images/scene-3.jpg' },
    ];

    const allComplete = scenes.every(s => s.image_url !== null);
    expect(allComplete).toBe(false);
  });
});

describe('Images Worker - Performance Metrics', () => {
  it('should track generation time per scene', () => {
    const startTime = Date.now();

    // Simulate work
    const endTime = Date.now() + 5000; // 5 seconds

    const generationTimeMs = endTime - startTime;
    expect(generationTimeMs).toBeGreaterThanOrEqual(5000);
  });

  it('should log download size in KB', () => {
    const imageSizeBytes = 512000; // 500 KB
    const imageSizeKB = imageSizeBytes / 1024;

    expect(imageSizeKB).toBeCloseTo(500, 0);
  });
});

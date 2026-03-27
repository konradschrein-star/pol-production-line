/**
 * Image Generation with Intelligent Retry
 *
 * Automatically retries with adjusted prompts on failure
 */

import { WhiskAPIClient } from './api';
import {
  adjustPrompt,
  shouldRetry,
  getRetryDelay,
  formatRetryLog,
  RetryResult,
  RetryAttempt,
} from './retry-strategy';

export interface GenerateWithRetryOptions {
  maxAttempts?: number;
  aspectRatio?: 'IMAGE_ASPECT_RATIO_SQUARE' | 'IMAGE_ASPECT_RATIO_LANDSCAPE' | 'IMAGE_ASPECT_RATIO_PORTRAIT';
  onAttempt?: (attempt: RetryAttempt) => void;
}

/**
 * Generate image with automatic retry and prompt adjustment
 */
export async function generateImageWithRetry(
  originalPrompt: string,
  options: GenerateWithRetryOptions = {}
): Promise<RetryResult> {
  const {
    maxAttempts = 6,
    aspectRatio = 'IMAGE_ASPECT_RATIO_LANDSCAPE',
    onAttempt,
  } = options;

  const client = new WhiskAPIClient();
  const result: RetryResult = {
    success: false,
    attempts: [],
    totalAttempts: 0,
    totalTimeMs: 0,
  };

  const startTime = Date.now();

  for (let attemptNum = 1; attemptNum <= maxAttempts; attemptNum++) {
    const { prompt, strategy } = adjustPrompt(originalPrompt, attemptNum);

    const attempt: RetryAttempt = {
      attemptNumber: attemptNum,
      prompt,
      strategy,
      success: false,
    };

    console.log(`\n🔄 [Retry] Attempt ${attemptNum}/${maxAttempts} (${strategy})`);
    console.log(`   Prompt: ${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}`);

    const attemptStart = Date.now();

    try {

      const apiResult = await client.generateImage({
        prompt,
        aspectRatio,
      });

      attempt.generationTimeMs = Date.now() - attemptStart;

      // Validate result
      if (!apiResult.images || apiResult.images.length === 0) {
        throw new Error('No images returned from API');
      }

      const firstImage = apiResult.images[0];
      if (!firstImage.url && !firstImage.base64) {
        throw new Error('No image URL or base64 data in response');
      }

      // Success!
      attempt.success = true;
      attempt.imageUrl = firstImage.url || (firstImage.base64 ? 'base64:' + firstImage.base64.substring(0, 20) : undefined);

      result.success = true;
      result.finalImageUrl = firstImage.url; // URL if available
      result.finalImageBase64 = firstImage.base64; // base64 if available
      result.attempts.push(attempt);
      result.totalAttempts = attemptNum;
      result.totalTimeMs = Date.now() - startTime;

      console.log(`✅ [Retry] Success on attempt ${attemptNum}!`);

      if (onAttempt) {
        await onAttempt(attempt);
      }

      break;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      attempt.error = errorMessage;
      attempt.generationTimeMs = Date.now() - attemptStart;

      result.attempts.push(attempt);

      console.error(`❌ [Retry] Attempt ${attemptNum} failed: ${errorMessage}`);

      if (onAttempt) {
        await onAttempt(attempt);
      }

      // Check if we should retry
      if (attemptNum < maxAttempts && shouldRetry(errorMessage, attemptNum, maxAttempts)) {
        const delay = getRetryDelay(attemptNum);
        console.log(`⏳ [Retry] Waiting ${(delay / 1000).toFixed(1)}s before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // No more retries
        result.totalAttempts = attemptNum;
        result.totalTimeMs = Date.now() - startTime;

        if (attemptNum >= maxAttempts) {
          console.error(`❌ [Retry] Max attempts (${maxAttempts}) reached - giving up`);
        }
        break;
      }
    }
  }

  // Log summary
  console.log(`\n${formatRetryLog(result)}`);

  return result;
}

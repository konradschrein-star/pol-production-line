/**
 * Intelligent Retry Strategy for Image Generation
 *
 * Automatically adjusts prompts and retries on failure
 */

export interface RetryAttempt {
  attemptNumber: number;
  prompt: string;
  strategy: string;
  success: boolean;
  error?: string;
  imageUrl?: string;
  generationTimeMs?: number;
}

export interface RetryResult {
  success: boolean;
  attempts: RetryAttempt[];
  finalImageUrl?: string;
  finalImageBase64?: string;
  totalAttempts: number;
  totalTimeMs: number;
}

/**
 * Adjust prompt for retry attempt
 * Each attempt uses a different simplification strategy
 */
export function adjustPrompt(originalPrompt: string, attemptNumber: number): {
  prompt: string;
  strategy: string;
} {
  const strategies = [
    {
      name: 'Original',
      apply: (p: string) => p,
    },
    {
      name: 'Remove Adjectives',
      apply: (p: string) => {
        // Remove common adjectives that might cause issues
        return p
          .replace(/photorealistic\s+/gi, '')
          .replace(/high-quality\s+/gi, '')
          .replace(/professional\s+/gi, '')
          .replace(/detailed\s+/gi, '')
          .replace(/stunning\s+/gi, '')
          .replace(/beautiful\s+/gi, '')
          .trim();
      },
    },
    {
      name: 'Simplified Core',
      apply: (p: string) => {
        // Extract just the main subject (first 3-5 words)
        const words = p.split(/\s+/);
        const coreWords = words.slice(0, 5).filter(w =>
          !['photorealistic', 'high-quality', 'professional', 'image', 'of', 'a', 'the'].includes(w.toLowerCase())
        );
        return coreWords.join(' ');
      },
    },
    {
      name: 'Generic News',
      apply: (p: string) => {
        // Generic news imagery based on keywords
        const keywords = extractKeywords(p);
        return `news broadcast image about ${keywords.slice(0, 3).join(', ')}`;
      },
    },
    {
      name: 'Ultra Simple',
      apply: (p: string) => {
        // Just the absolute basics
        const keywords = extractKeywords(p);
        return keywords[0] || 'news scene';
      },
    },
    {
      name: 'Alternative Style',
      apply: (p: string) => {
        // Different visual style
        return `illustration of ${extractKeywords(p).slice(0, 3).join(', ')}`;
      },
    },
  ];

  const strategyIndex = (attemptNumber - 1) % strategies.length;
  const strategy = strategies[strategyIndex];

  return {
    prompt: strategy.apply(originalPrompt),
    strategy: strategy.name,
  };
}

/**
 * Extract important keywords from prompt
 */
function extractKeywords(prompt: string): string[] {
  // Remove common filler words
  const fillerWords = new Set([
    'photorealistic', 'image', 'of', 'a', 'the', 'with', 'in', 'at', 'on',
    'high-quality', 'professional', 'photo', 'photograph', 'picture',
    'showing', 'depicting', 'featuring', 'and', 'or', 'but', 'for',
  ]);

  const words = prompt
    .toLowerCase()
    .replace(/[.,;:!?]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !fillerWords.has(w));

  // Return unique words
  return [...new Set(words)];
}

/**
 * Determine if we should retry based on error
 */
export function shouldRetry(error: string, attemptNumber: number, maxAttempts: number = 6): boolean {
  // Always retry if we haven't hit max attempts
  if (attemptNumber >= maxAttempts) {
    return false;
  }

  // Don't retry certain permanent errors
  const permanentErrors = [
    'authentication failed',
    'api key invalid',
    'quota exceeded',
  ];

  const errorLower = error.toLowerCase();
  for (const permError of permanentErrors) {
    if (errorLower.includes(permError)) {
      return false;
    }
  }

  return true;
}

/**
 * Calculate backoff delay (exponential with jitter)
 */
export function getRetryDelay(attemptNumber: number): number {
  // Base delay: 1s, 2s, 4s, 8s, 16s, 32s
  const baseDelay = Math.min(1000 * Math.pow(2, attemptNumber - 1), 32000);

  // Add random jitter (±20%)
  const jitter = baseDelay * 0.2 * (Math.random() - 0.5);

  return Math.floor(baseDelay + jitter);
}

/**
 * Format retry result for logging
 */
export function formatRetryLog(result: RetryResult): string {
  const lines = [
    `Retry Summary: ${result.success ? '✅ SUCCESS' : '❌ FAILED'} after ${result.totalAttempts} attempts (${(result.totalTimeMs / 1000).toFixed(1)}s)`,
  ];

  result.attempts.forEach((attempt, i) => {
    const status = attempt.success ? '✅' : '❌';
    const time = attempt.generationTimeMs ? `${(attempt.generationTimeMs / 1000).toFixed(1)}s` : 'N/A';
    lines.push(`  ${status} Attempt ${i + 1} (${attempt.strategy}): ${time}`);
    if (attempt.error) {
      lines.push(`     Error: ${attempt.error.substring(0, 100)}`);
    }
  });

  return lines.join('\n');
}

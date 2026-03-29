/**
 * Error categorization utility for quality check system
 * Maps error messages to user-friendly categories
 */

export type ErrorCategory =
  | 'policy_violation'
  | 'timeout'
  | 'api_error'
  | 'rate_limit'
  | 'auth_error'
  | 'unknown';

export interface CategorizedError {
  category: ErrorCategory;
  userMessage: string;
  solution: string;
  canRetry: boolean;
}

/**
 * Categorizes an error based on its message
 */
export function categorizeError(error: Error | string): ErrorCategory {
  const msg = (typeof error === 'string' ? error : error.message).toLowerCase();

  // Policy violations (content filters)
  if (
    msg.includes('policy') ||
    msg.includes('filter_failed') ||
    msg.includes('content violation') ||
    msg.includes('inappropriate')
  ) {
    return 'policy_violation';
  }

  // Timeouts
  if (msg.includes('timeout') || msg.includes('timed out')) {
    return 'timeout';
  }

  // Rate limiting
  if (msg.includes('429') || msg.includes('rate limit') || msg.includes('too many requests')) {
    return 'rate_limit';
  }

  // Authentication errors
  if (msg.includes('401') || msg.includes('token') || msg.includes('unauthorized')) {
    return 'auth_error';
  }

  // Generic API errors
  if (
    msg.includes('api') ||
    msg.includes('500') ||
    msg.includes('503') ||
    msg.includes('network')
  ) {
    return 'api_error';
  }

  return 'unknown';
}

/**
 * Gets detailed error information for display in UI
 */
export function getErrorDetails(
  category: ErrorCategory,
  sanitizationAttempts: number = 0
): CategorizedError {
  const maxAttempts = 3;
  const canRetry = sanitizationAttempts < maxAttempts;

  switch (category) {
    case 'policy_violation':
      return {
        category,
        userMessage: sanitizationAttempts >= maxAttempts
          ? 'The image generation was blocked by content policy after 3 sanitization attempts.'
          : 'The image generation was blocked by content policy.',
        solution: canRetry
          ? 'Our AI will attempt to rephrase the prompt automatically.'
          : 'Edit the prompt manually to remove political references or controversial terms, or upload a custom image instead.',
        canRetry,
      };

    case 'timeout':
      return {
        category,
        userMessage: 'The image generation request timed out.',
        solution: 'The Whisk API may be experiencing high load. Try regenerating this scene.',
        canRetry: true,
      };

    case 'rate_limit':
      return {
        category,
        userMessage: 'Rate limit reached for image generation.',
        solution: 'Wait a few minutes before retrying. The system will automatically adjust concurrency.',
        canRetry: true,
      };

    case 'auth_error':
      return {
        category,
        userMessage: 'Whisk API token has expired or is invalid.',
        solution: 'Refresh the Whisk API token in settings. See documentation for token refresh instructions.',
        canRetry: false,
      };

    case 'api_error':
      return {
        category,
        userMessage: 'The Whisk API encountered an internal error.',
        solution: 'Try regenerating this scene. If the problem persists, check the Whisk API status.',
        canRetry: true,
      };

    case 'unknown':
    default:
      return {
        category: 'unknown',
        userMessage: 'An unexpected error occurred during image generation.',
        solution: 'Try regenerating this scene. If the problem persists, check the application logs.',
        canRetry: true,
      };
  }
}

/**
 * Gets status badge color based on error category
 */
export function getErrorBadgeColor(category: ErrorCategory): string {
  switch (category) {
    case 'policy_violation':
      return 'red'; // Critical - requires manual intervention
    case 'auth_error':
      return 'red'; // Critical - system-wide issue
    case 'timeout':
      return 'yellow'; // Warning - can retry
    case 'rate_limit':
      return 'orange'; // Warning - temporary issue
    case 'api_error':
      return 'orange'; // Warning - external issue
    case 'unknown':
    default:
      return 'gray'; // Unknown severity
  }
}

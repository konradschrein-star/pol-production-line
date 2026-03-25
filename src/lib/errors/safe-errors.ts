/**
 * Error Sanitization
 *
 * Prevents sensitive data leakage in error messages by:
 * - Redacting file paths
 * - Redacting database connection strings
 * - Redacting API keys
 * - Redacting SQL query details
 * - Converting technical errors to user-friendly messages
 */

/**
 * Sanitize error messages to prevent sensitive data leakage
 *
 * @param error - Error to sanitize
 * @returns User-safe error message
 */
export function sanitizeError(error: unknown): string {
  // Handle non-Error objects
  if (!(error instanceof Error)) {
    return 'An unexpected error occurred';
  }

  let message = error.message;

  // Redact Windows file paths (C:\Users\..., D:\Projects\...)
  message = message.replace(/[A-Z]:\\[^\s]+/g, '[path]');

  // Redact Unix file paths (/home/..., /var/..., /Users/...)
  message = message.replace(/\/(?:home|var|usr|opt|Users)\/[^\s]+/g, '[path]');

  // Redact PostgreSQL connection strings
  message = message.replace(/postgres:\/\/[^\s]+/g, '[database_url]');
  message = message.replace(/postgresql:\/\/[^\s]+/g, '[database_url]');

  // Redact database credentials in connection strings
  message = message.replace(/user=[^\s&]+/g, 'user=[redacted]');
  message = message.replace(/password=[^\s&]+/g, 'password=[redacted]');

  // Redact Google OAuth tokens (ya29.*)
  message = message.replace(/ya29\.[A-Za-z0-9_-]+/g, '[api_key]');

  // Redact OpenAI API keys (sk-*)
  message = message.replace(/sk-[A-Za-z0-9]+/g, '[api_key]');

  // Redact Anthropic API keys (sk-ant-*)
  message = message.replace(/sk-ant-[A-Za-z0-9_-]+/g, '[api_key]');

  // Redact UUIDs in sensitive contexts (e.g., "job abc123-..." in error messages)
  // Keep UUIDs that are part of meaningful context, redact when they look like IDs
  message = message.replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '[id]');

  // Redact SQL query details while preserving error type
  if (message.includes('syntax error') || message.includes('invalid input syntax')) {
    return 'Database query error - Invalid syntax';
  }

  // Convert common technical errors to user-friendly messages
  if (message.includes('ENOENT') || message.includes('no such file')) {
    return 'File not found';
  }

  if (message.includes('EACCES') || message.includes('permission denied')) {
    return 'File access denied';
  }

  if (message.includes('ECONNREFUSED')) {
    return 'Service unavailable - Connection refused';
  }

  if (message.includes('ETIMEDOUT') || message.includes('timeout')) {
    return 'Service temporarily unavailable - Request timed out';
  }

  if (message.includes('ENOTFOUND') || message.includes('getaddrinfo')) {
    return 'Service unavailable - Host not found';
  }

  if (message.includes('duplicate key') || message.includes('unique constraint')) {
    return 'Duplicate entry - Record already exists';
  }

  if (message.includes('foreign key constraint') || message.includes('violates foreign key')) {
    return 'Invalid reference - Related record not found';
  }

  if (message.includes('check constraint') || message.includes('violates check')) {
    return 'Invalid data - Does not meet validation requirements';
  }

  if (message.includes('not-null constraint') || message.includes('null value')) {
    return 'Missing required field';
  }

  if (message.includes('ENOSPC') || message.includes('no space left')) {
    return 'Storage full - Unable to save file';
  }

  if (message.includes('rate limit') || message.includes('too many requests')) {
    return 'Rate limit exceeded - Please try again later';
  }

  // If message is now empty or too short after redaction, return generic error
  if (message.trim().length < 5) {
    return 'An error occurred while processing your request';
  }

  return message;
}

/**
 * Create a user-safe error response object
 *
 * @param error - Error to sanitize
 * @param includeDetails - Whether to include full details (dev mode only)
 * @returns Safe error response object
 */
export function createErrorResponse(
  error: unknown,
  includeDetails: boolean = process.env.NODE_ENV === 'development'
): {
  error: string;
  details?: string;
  code?: string;
} {
  const sanitizedMessage = sanitizeError(error);

  const response: {
    error: string;
    details?: string;
    code?: string;
  } = {
    error: sanitizedMessage,
  };

  // Include full error details in development mode
  if (includeDetails && error instanceof Error) {
    response.details = error.message;
    response.code = (error as any).code; // Error code if available (e.g., ENOENT)
  }

  return response;
}

/**
 * Log error with full details (server-side only)
 * Sanitized version is returned to client
 *
 * @param context - Context string (e.g., "[API] /api/jobs/123")
 * @param error - Error to log
 * @returns Sanitized error message for client
 */
export function logAndSanitizeError(context: string, error: unknown): string {
  // Log full error server-side
  console.error(`${context} Error:`, error);

  // Log stack trace if available
  if (error instanceof Error && error.stack) {
    console.error(`${context} Stack:`, error.stack);
  }

  // Return sanitized message for client
  return sanitizeError(error);
}

/**
 * Check if error is a known safe error that can be returned as-is
 * (e.g., application-level validation errors)
 *
 * @param error - Error to check
 * @returns true if error is safe to return to client
 */
export function isSafeError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  // Application-level errors with safe messages
  const safeErrorPrefixes = [
    'Validation failed',
    'Invalid UUID',
    'Job not found',
    'Scene not found',
    'Invalid status transition',
    'File too large',
    'Unsupported file type',
  ];

  return safeErrorPrefixes.some((prefix) => error.message.startsWith(prefix));
}

/**
 * Get HTTP status code for error
 *
 * @param error - Error object
 * @returns Appropriate HTTP status code
 */
export function getErrorStatusCode(error: unknown): number {
  if (!(error instanceof Error)) return 500;

  const message = error.message.toLowerCase();

  // Client errors (4xx)
  if (message.includes('not found')) return 404;
  if (message.includes('validation') || message.includes('invalid')) return 400;
  if (message.includes('unauthorized') || message.includes('authentication')) return 401;
  if (message.includes('forbidden') || message.includes('permission')) return 403;
  if (message.includes('conflict') || message.includes('duplicate')) return 409;
  if (message.includes('too large') || message.includes('payload')) return 413;
  if (message.includes('rate limit')) return 429;

  // Server errors (5xx)
  if (message.includes('timeout')) return 504;
  if (message.includes('unavailable') || message.includes('refused')) return 503;

  // Default to 500 Internal Server Error
  return 500;
}

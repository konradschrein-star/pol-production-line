/**
 * Pexels SDK Error Classes
 * Structured error handling for better debugging and error recovery
 */

export class PexelsError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'PexelsError';
    Object.setPrototypeOf(this, PexelsError.prototype);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

export class PexelsAuthError extends PexelsError {
  constructor(message: string = 'Invalid API key', details?: any) {
    super(message, 'AUTH_ERROR', 401, details);
    this.name = 'PexelsAuthError';
    Object.setPrototypeOf(this, PexelsAuthError.prototype);
  }
}

export class PexelsRateLimitError extends PexelsError {
  constructor(
    message: string,
    public resetTime: Date,
    public limit: number,
    public remaining: number
  ) {
    super(message, 'RATE_LIMIT_ERROR', 429, { resetTime, limit, remaining });
    this.name = 'PexelsRateLimitError';
    Object.setPrototypeOf(this, PexelsRateLimitError.prototype);
  }
}

export class PexelsNotFoundError extends PexelsError {
  constructor(message: string = 'Resource not found', details?: any) {
    super(message, 'NOT_FOUND', 404, details);
    this.name = 'PexelsNotFoundError';
    Object.setPrototypeOf(this, PexelsNotFoundError.prototype);
  }
}

export class PexelsNetworkError extends PexelsError {
  constructor(message: string, public originalError?: Error) {
    super(message, 'NETWORK_ERROR', undefined, { originalError: originalError?.message });
    this.name = 'PexelsNetworkError';
    Object.setPrototypeOf(this, PexelsNetworkError.prototype);
  }
}

export class PexelsValidationError extends PexelsError {
  constructor(message: string, public field?: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, { field, ...details });
    this.name = 'PexelsValidationError';
    Object.setPrototypeOf(this, PexelsValidationError.prototype);
  }
}

/**
 * Error Code System
 * Provides specific, actionable error messages for better UX
 */

export enum ErrorCode {
  // Configuration Errors
  INVALID_API_KEY = 'INVALID_API_KEY',
  MISSING_API_KEY = 'MISSING_API_KEY',
  INVALID_AI_PROVIDER = 'INVALID_AI_PROVIDER',

  // Validation Errors
  SCRIPT_TOO_SHORT = 'SCRIPT_TOO_SHORT',
  INVALID_JOB_STATUS = 'INVALID_JOB_STATUS',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',

  // Resource Errors
  JOB_NOT_FOUND = 'JOB_NOT_FOUND',
  SCENE_NOT_FOUND = 'SCENE_NOT_FOUND',
  DISK_SPACE_LOW = 'DISK_SPACE_LOW',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',

  // Queue Errors
  QUEUE_PAUSED = 'QUEUE_PAUSED',
  QUEUE_FAILED = 'QUEUE_FAILED',
  GOOGLE_WISK_BAN = 'GOOGLE_WISK_BAN',

  // Worker Errors
  IMAGE_GENERATION_FAILED = 'IMAGE_GENERATION_FAILED',
  REMOTION_RENDER_FAILED = 'REMOTION_RENDER_FAILED',
  AVATAR_UPLOAD_FAILED = 'AVATAR_UPLOAD_FAILED',

  // Database Errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  REDIS_ERROR = 'REDIS_ERROR',

  // Generic
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface ErrorResponse {
  error: string;
  code: ErrorCode;
  solution?: string;
  details?: string;
}

export const ERROR_MESSAGES: Record<ErrorCode, { message: string; solution: string }> = {
  // Configuration Errors
  [ErrorCode.INVALID_API_KEY]: {
    message: 'Invalid API key for selected AI provider',
    solution: 'Check your API key is correct in the .env file. Regenerate the key if needed.',
  },
  [ErrorCode.MISSING_API_KEY]: {
    message: 'Missing API key for selected AI provider',
    solution: 'Add the required API key to your .env file. See .env.md for instructions.',
  },
  [ErrorCode.INVALID_AI_PROVIDER]: {
    message: 'Invalid AI provider specified',
    solution: 'Set AI_PROVIDER to one of: "google", "claude", or "groq" in your .env file.',
  },

  // Validation Errors
  [ErrorCode.SCRIPT_TOO_SHORT]: {
    message: 'News script is too short',
    solution: 'Provide a script with at least 100 characters. Add more content to your news script.',
  },
  [ErrorCode.INVALID_JOB_STATUS]: {
    message: 'Job is not in the correct status for this action',
    solution: 'Wait for the job to reach the appropriate status before performing this action.',
  },
  [ErrorCode.INVALID_FILE_TYPE]: {
    message: 'Invalid file type uploaded',
    solution: 'Upload a file with the correct format (e.g., MP4 for avatars, PNG/JPG for images).',
  },
  [ErrorCode.FILE_TOO_LARGE]: {
    message: 'File size exceeds maximum allowed',
    solution: 'Compress your file to under 100MB. Use HandBrake or FFmpeg for video compression.',
  },

  // Resource Errors
  [ErrorCode.JOB_NOT_FOUND]: {
    message: 'Job not found',
    solution: 'The job may have been deleted. Check the job ID and try again.',
  },
  [ErrorCode.SCENE_NOT_FOUND]: {
    message: 'Scene not found',
    solution: 'The scene may have been deleted. Refresh the page and try again.',
  },
  [ErrorCode.DISK_SPACE_LOW]: {
    message: 'Low disk space on storage drive',
    solution: 'Free up at least 10GB of space on your C: drive. Delete old broadcast videos.',
  },
  [ErrorCode.FILE_NOT_FOUND]: {
    message: 'File not found on disk',
    solution: 'The file may have been moved or deleted. Try regenerating or re-uploading.',
  },

  // Queue Errors
  [ErrorCode.QUEUE_PAUSED]: {
    message: 'Worker queue is paused',
    solution: 'Resume the queue by clicking "RESUME QUEUE" or restart workers with STOP.bat then START.bat.',
  },
  [ErrorCode.QUEUE_FAILED]: {
    message: 'Failed to add job to queue',
    solution: 'Check that Redis is running. Restart the system if needed.',
  },
  [ErrorCode.GOOGLE_WISK_BAN]: {
    message: 'Google Wisk ban detected',
    solution: 'Log into https://labs.google.com/wisk manually, wait 15 minutes, then restart workers.',
  },

  // Worker Errors
  [ErrorCode.IMAGE_GENERATION_FAILED]: {
    message: 'Image generation failed',
    solution: 'Try regenerating the image. If it fails again, upload a custom image instead.',
  },
  [ErrorCode.REMOTION_RENDER_FAILED]: {
    message: 'Video rendering failed',
    solution: 'Check Remotion worker logs for details. Verify all scenes have images and avatar is uploaded.',
  },
  [ErrorCode.AVATAR_UPLOAD_FAILED]: {
    message: 'Avatar upload failed',
    solution: 'Ensure your MP4 uses H.264 codec and 48kHz audio. Re-export from HeyGen if needed.',
  },

  // Database Errors
  [ErrorCode.DATABASE_ERROR]: {
    message: 'Database connection error',
    solution: 'Check that PostgreSQL Docker container is running. Restart system with STOP.bat then START.bat.',
  },
  [ErrorCode.REDIS_ERROR]: {
    message: 'Redis connection error',
    solution: 'Check that Redis Docker container is running. Restart system with STOP.bat then START.bat.',
  },

  // Generic
  [ErrorCode.UNKNOWN_ERROR]: {
    message: 'An unknown error occurred',
    solution: 'Check worker console logs for details. Contact system administrator if issue persists.',
  },
};

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  code: ErrorCode,
  details?: string
): ErrorResponse {
  const { message, solution } = ERROR_MESSAGES[code];

  return {
    error: message,
    code,
    solution,
    details,
  };
}

/**
 * Log error with context
 */
export function logError(
  context: string,
  code: ErrorCode,
  details?: unknown
) {
  const { message, solution } = ERROR_MESSAGES[code];

  console.error(`❌ [${context}] ${message}`);
  console.error(`   Code: ${code}`);
  if (details) {
    console.error(`   Details:`, details);
  }
  console.error(`   Solution: ${solution}`);
}

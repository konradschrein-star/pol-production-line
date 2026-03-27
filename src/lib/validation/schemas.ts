/**
 * Zod Validation Schemas
 *
 * Comprehensive input validation to prevent:
 * - SQL injection (UUID validation)
 * - File upload attacks (magic byte validation)
 * - DOS attacks (size limits)
 * - Data corruption (type/length validation)
 */

import { z } from 'zod';

// ===== PRIMITIVE SCHEMAS =====

/**
 * UUID validation - Prevents SQL injection via route parameters
 */
export const uuidSchema = z.string().uuid({
  message: 'Invalid UUID format',
});

/**
 * File size validator (in bytes)
 */
const fileSizeValidator = (maxBytes: number, label: string) =>
  z.custom<File>(
    (file) => file instanceof File && file.size <= maxBytes,
    {
      message: `File size must be under ${Math.round(maxBytes / 1024 / 1024)}MB`,
    }
  );

/**
 * File type validator (MIME type)
 */
const fileTypeValidator = (allowedTypes: string[], label: string) =>
  z.custom<File>(
    (file) => file instanceof File && allowedTypes.includes(file.type),
    {
      message: `File type must be one of: ${allowedTypes.join(', ')}`,
    }
  );

// ===== ROUTE PARAMETER SCHEMAS =====

/**
 * Job ID route parameter validation
 * Used by: /api/jobs/[id]/*
 */
export const jobIdParamsSchema = z.object({
  id: uuidSchema,
});

/**
 * Scene ID route parameter validation
 * Used by: /api/jobs/[id]/scenes/[scene_id]/*
 */
export const sceneIdParamsSchema = z.object({
  id: uuidSchema,
  scene_id: uuidSchema,
});

/**
 * Style preset ID parameter
 */
export const presetIdParamsSchema = z.object({
  id: uuidSchema,
});

// ===== FILE UPLOAD SCHEMAS =====

/**
 * Avatar MP4 upload validation
 *
 * Validates:
 * - File size (max 100MB)
 * - MIME type (video/mp4)
 * - Magic bytes (ftyp signature at offset 4)
 */
export const avatarUploadSchema = z.object({
  avatar_mp4: z.custom<File>(
    async (file) => {
      // Check instance
      if (!(file instanceof File)) return false;

      // Check size (100MB max)
      if (file.size > 100 * 1024 * 1024) return false;

      // Check MIME type
      if (file.type !== 'video/mp4') return false;

      // Check magic bytes for MP4 (ftyp at offset 4)
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        if (buffer.length < 12) return false;

        const signature = buffer.toString('ascii', 4, 8);
        return signature === 'ftyp';
      } catch {
        return false;
      }
    },
    {
      message: 'Invalid MP4 file (must be valid MP4 format, max 100MB)',
    }
  ),
});

/**
 * Image upload validation (scene images)
 *
 * Validates:
 * - File size (max 10MB)
 * - MIME type (PNG, JPEG, WebP)
 * - Magic bytes (optional, for future enhancement)
 */
export const imageUploadSchema = z.object({
  image: z.custom<File>(
    (file) => {
      if (!(file instanceof File)) return false;
      if (file.size > 10 * 1024 * 1024) return false;
      return ['image/png', 'image/jpeg', 'image/webp'].includes(file.type);
    },
    {
      message: 'Invalid image file (must be PNG/JPEG/WebP, max 10MB)',
    }
  ),
});

// ===== REQUEST BODY SCHEMAS =====

/**
 * Job creation validation
 * Used by: POST /api/jobs
 */
export const createJobSchema = z.object({
  raw_script: z.string()
    .min(50, 'Script must be at least 50 characters')
    .max(50000, 'Script must not exceed 50,000 characters'),
  style_preset_id: uuidSchema.optional(),
  provider: z.enum(['openai', 'claude', 'google', 'groq']).optional(),
  use_scene_based: z.boolean().optional(),
  avatar_duration_seconds: z.number().min(10).max(600).optional(),
});

/**
 * Job update validation
 * Used by: PATCH /api/jobs/[id]
 */
export const updateJobSchema = z.object({
  raw_script: z.string().min(50).max(50000).optional(),
  avatar_script: z.string().min(10).max(50000).optional(),
  status: z.enum([
    'pending',
    'analyzing',
    'generating_images',
    'review_assets',
    'rendering',
    'completed',
    'failed',
    'cancelled',
  ]).optional(),
  error_message: z.string().max(2000).optional().nullable(),
});

/**
 * Scene update validation
 * Used by: PATCH /api/jobs/[id]/scenes/[scene_id]
 */
export const sceneUpdateSchema = z.object({
  image_prompt: z.string()
    .min(10, 'Image prompt must be at least 10 characters')
    .max(2000, 'Image prompt must not exceed 2000 characters')
    .optional(),
  ticker_headline: z.string()
    .max(200, 'Ticker headline must not exceed 200 characters')
    .optional(),
  scene_order: z.number().int().min(0).optional(),
});

/**
 * Reference images update validation
 * Used by: PATCH /api/jobs/[id]/scenes/[scene_id]/references
 */
export const referenceImagesSchema = z.object({
  style_image_url: z.string().url().optional().nullable(),
  subject_image_url: z.string().url().optional().nullable(),
  scene_image_url: z.string().url().optional().nullable(),
});

/**
 * Style preset creation/update validation
 */
export const stylePresetSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  is_default: z.boolean().optional(),
});

/**
 * Bulk job operations validation
 * Used by: POST /api/jobs/bulk
 */
export const bulkJobOperationSchema = z.object({
  operation: z.enum(['delete', 'cancel', 'retry']),
  job_ids: z.array(uuidSchema)
    .min(1, 'Must specify at least one job')
    .max(100, 'Cannot operate on more than 100 jobs at once'),
});

/**
 * Scene regeneration validation
 * Used by: POST /api/jobs/[id]/scenes/[scene_id]/regenerate
 */
export const sceneRegenerateSchema = z.object({
  image_prompt: z.string().min(10).max(2000).optional(),
});

/**
 * Pagination query parameters
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort_by: z.enum(['created_at', 'updated_at', 'status']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Job list filter parameters
 */
export const jobFilterSchema = paginationSchema.extend({
  status: z.enum([
    'all',
    'pending',
    'analyzing',
    'generating_images',
    'review_assets',
    'rendering',
    'completed',
    'failed',
    'cancelled',
  ]).optional(),
  search: z.string().max(200).optional(),
});

// ===== HELPER FUNCTIONS =====

/**
 * Validate and parse request body
 * Throws ZodError if validation fails
 */
export async function validateBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown
): Promise<T> {
  return schema.parseAsync(body);
}

/**
 * Validate and parse route parameters
 * Throws ZodError if validation fails
 */
export function validateParams<T>(
  schema: z.ZodSchema<T>,
  params: unknown
): T {
  return schema.parse(params);
}

/**
 * Validate and parse query parameters
 * Throws ZodError if validation fails
 */
export function validateQuery<T>(
  schema: z.ZodSchema<T>,
  query: unknown
): T {
  return schema.parse(query);
}

/**
 * Format Zod validation errors for API responses
 */
export function formatValidationErrors(error: z.ZodError): {
  error: string;
  issues: Array<{ path: string; message: string }>;
} {
  return {
    error: 'Validation failed',
    issues: error.issues.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    })),
  };
}

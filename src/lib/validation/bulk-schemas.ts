/**
 * Zod Validation Schemas for Bulk Operations
 *
 * Validates bulk job operations (delete, cancel, retry)
 * to prevent malformed requests and ensure data integrity.
 */

import { z } from 'zod';

/**
 * Bulk operation schema
 *
 * Validates:
 * - action: Must be 'delete', 'cancel', or 'retry'
 * - job_ids: Must be array of 1-50 valid UUIDs
 * - reason: Optional audit trail message
 */
export const BulkOperationSchema = z.object({
  action: z.enum(['delete', 'cancel', 'retry'], {
    errorMap: () => ({ message: 'Action must be one of: delete, cancel, retry' }),
  }),

  jobIds: z
    .array(z.string().uuid({ message: 'Each job ID must be a valid UUID' }))
    .min(1, 'At least one job ID is required')
    .max(50, 'Cannot operate on more than 50 jobs at once'),

  reason: z
    .string()
    .max(500, 'Reason must be less than 500 characters')
    .optional(),
});

export type BulkOperation = z.infer<typeof BulkOperationSchema>;

/**
 * Validate bulk operation request
 *
 * @param data - Raw request body
 * @returns Validated data or validation errors
 */
export function validateBulkOperation(data: unknown): {
  success: boolean;
  data?: BulkOperation;
  errors?: z.ZodError;
} {
  const result = BulkOperationSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error };
  }
}

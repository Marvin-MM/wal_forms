/**
 * Economics and platform account domain entities.
 */
import { z } from 'zod';

export const PlatformAccountSchema = z.object({
  walletAddress: z.string(),
  availableCredits: z.number().int().min(0),
  totalSpent: z.number().int().min(0),
});

export type PlatformAccount = z.infer<typeof PlatformAccountSchema>;

export const CostEventTypeEnum = z.enum(['submission_sponsored', 'storage_renewal', 'deposit']);
export type CostEventType = z.infer<typeof CostEventTypeEnum>;

export const CostEventSchema = z.object({
  id: z.string().uuid(),
  walletAddress: z.string(),
  formId: z.string().uuid().nullable(),
  type: CostEventTypeEnum,
  amount: z.number().int(),
  description: z.string().nullable(),
});

export type CostEvent = z.infer<typeof CostEventSchema>;

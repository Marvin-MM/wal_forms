/**
 * Walrus Blob domain entity.
 */
import { z } from 'zod';

export const WalrusBlobStatusEnum = z.enum(['active', 'expiring_soon', 'expired']);
export type WalrusBlobStatus = z.infer<typeof WalrusBlobStatusEnum>;

export const WalrusBlobTypeEnum = z.enum(['schema', 'submission', 'branding_logo']);
export type WalrusBlobType = z.infer<typeof WalrusBlobTypeEnum>;

export const WalrusBlobSchema = z.object({
  id: z.string(),
  formId: z.string().uuid().nullable(),
  type: WalrusBlobTypeEnum,
  sizeBytes: z.number().int().nullable(),
  epochs: z.number().int(),
  expiresAtEpoch: z.number().int(),
  status: WalrusBlobStatusEnum,
});

export type WalrusBlob = z.infer<typeof WalrusBlobSchema>;

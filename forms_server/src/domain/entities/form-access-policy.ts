/**
 * Form Access Policy Domain Entities
 *
 * Access control for form submissions. Five layers checked in order:
 *   1. Form closed (is_closed flag)
 *   2. Time window (opens_at / closes_at)
 *   3. Response limit (response_limit)
 *   4. Allowlist (requires_allowlist + form_allowlist table)
 *   5. Password (password_hash — SHA3-256, stored hashed, never returned)
 *
 * The on-chain FormAccessPolicy object (access.move) enforces the time
 * window and password check during the Sui transaction. The server-side
 * check here is a fast pre-flight that avoids submitting transactions
 * that would fail on-chain, giving the user a better error message.
 */
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Denial reasons — specific enough for frontend rendering, not security leaks
// ---------------------------------------------------------------------------
export type AccessDenialReason =
  | 'form_closed'
  | 'form_not_yet_open'
  | 'form_closed_time_expired'
  | 'response_limit_reached'
  | 'not_on_allowlist'
  | 'identity_required_for_allowlist'
  | 'invalid_password'; // same response for missing OR incorrect password

// ---------------------------------------------------------------------------
// Access Decision
// ---------------------------------------------------------------------------
export interface AccessDecision {
  allowed: boolean;
  denialReason?: AccessDenialReason;
}

// ---------------------------------------------------------------------------
// FormAccessPolicy Entity
// ---------------------------------------------------------------------------
const BaseFormAccessPolicySchema = z.object({
  formId: z.string().uuid(),
  requiresAllowlist: z.boolean().default(false),
  hasResponseLimit: z.boolean().default(false),
  /** Must be a positive integer when hasResponseLimit is true. */
  responseLimit: z.number().int().positive().nullable().optional(),
  opensAt: z.coerce.date().nullable().optional(),
  closesAt: z.coerce.date().nullable().optional(),
  /**
   * Plaintext password provided by the form creator.
   * The application layer hashes it (SHA3-256) before storing.
   * Min 8 characters validated HERE before hashing — never after.
   */
  password: z.string().min(8, 'Password must be at least 8 characters').nullable().optional(),
  /** Explicitly remove the stored password hash. */
  clearPassword: z.boolean().optional(),
});

export const FormAccessPolicySchema = BaseFormAccessPolicySchema.superRefine((data, ctx) => {
  // Response limit must be set if hasResponseLimit is true
  if (data.hasResponseLimit && !data.responseLimit) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['responseLimit'],
      message: 'responseLimit is required when hasResponseLimit is true',
    });
  }
  // closesAt must be after opensAt if both are provided
  if (data.opensAt && data.closesAt && data.closesAt <= data.opensAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['closesAt'],
      message: 'closesAt must be after opensAt',
    });
  }
});

export type FormAccessPolicyInput = z.infer<typeof FormAccessPolicySchema>;

/** API response shape — password hash is never returned. */
export const FormAccessPolicyResponseSchema = BaseFormAccessPolicySchema
  .omit({ password: true, clearPassword: true })
  .extend({
    hasPassword: z.boolean(), // true if a password is set, never the hash
    suiObjectId: z.string().optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
  });

export type FormAccessPolicyResponse = z.infer<typeof FormAccessPolicyResponseSchema>;

// ---------------------------------------------------------------------------
// AllowlistEntry Entity
// ---------------------------------------------------------------------------

/** Validates a Sui wallet address: 0x-prefixed hex, 64 hex chars after prefix. */
const suiAddressSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{64}$/, 'Must be a valid Sui wallet address (0x + 64 hex chars)');

export const AllowlistEntrySchema = z.object({
  formId: z.string().uuid(),
  allowedAddress: suiAddressSchema,
  addedAt: z.date(),
});

export type AllowlistEntry = z.infer<typeof AllowlistEntrySchema>;

export const AddAllowlistEntryBodySchema = z.object({
  walletAddress: suiAddressSchema,
});

export type AddAllowlistEntryBody = z.infer<typeof AddAllowlistEntryBodySchema>;

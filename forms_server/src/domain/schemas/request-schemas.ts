/**
 * Request validation schemas for all API endpoints.
 * Validated at the boundary before any domain logic executes.
 *
 * Phase A additions:
 *   - CreateFormSchema now requires submissionIdentityMode
 *   - CreateSubmissionSchema is a discriminated union (3 variants)
 *   - Access policy and allowlist schemas
 *   - Branding schema
 *   - Upload session gains upload_purpose field
 */
import { z } from 'zod';
import { FormSchemaDefinition } from './form-schema.js';
import { SubmissionIdentityModeEnum } from '../entities/submission-identity.js';
import { UpsertFormBrandingBodySchema } from '../entities/form-branding.js';
import { FormAccessPolicySchema, AddAllowlistEntryBodySchema } from '../entities/form-access-policy.js';
import { UpsertNotificationPreferenceBodySchema } from '../entities/notification-preference.js';

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export const RequestNonceSchema = z.object({
  walletAddress: z.string().min(1, 'Wallet address is required'),
});

export const VerifySiWSSchema = z.object({
  walletAddress: z.string().min(1),
  signedMessage: z.string().min(1),
  signature: z.string().min(1),
  nonce: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Forms
// ---------------------------------------------------------------------------
export const CreateFormSchema = z.object({
  schema: FormSchemaDefinition,
  isPrivate: z.boolean().default(false),
  /**
   * Required — determines which submission flow applies to this form.
   * Mirrors the Move contract's IDENTITY_* constants (submission.move).
   */
  submissionIdentityMode: SubmissionIdentityModeEnum,
});

export const UpdateFormSchemaInput = z.object({
  schema: FormSchemaDefinition,
  isPrivate: z.boolean().optional(),
  submissionIdentityMode: SubmissionIdentityModeEnum.optional(),
});

export const ListFormsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

// ---------------------------------------------------------------------------
// Submissions — discriminated union body
//
// The route handler reads the form's identity mode from the DB, then validates
// the body against the matching schema variant. Using a discriminated union
// gives the frontend explicit type narrowing per flow.
// ---------------------------------------------------------------------------

/** Shared fields across all submission variants. */
const SubmissionBaseSchema = z.object({
  /** Walrus blob ID of the pre-uploaded submission content. */
  blobId: z.string().min(1, 'Blob ID is required'),
  turnstileToken: z.string().min(1, 'Turnstile token is required'),
  isEncrypted: z.boolean().default(false),
  /**
   * Optional password for password-protected forms.
   * Validated against the stored hash server-side.
   * Same response for missing or incorrect password (timing-safe).
   */
  password: z.string().optional(),
});

/**
 * Anonymous submission — no wallet involved.
 * The server wallet executes the full submit_anonymous PTB.
 */
export const AnonymousSubmissionBodySchema = SubmissionBaseSchema.extend({
  identity_mode: z.literal('anonymous'),
});

/**
 * Sponsored submission — phase 1.
 * Client sends unsigned PTB bytes; server adds gas sponsorship.
 * Returns sponsored bytes + session token for phase 2.
 */
export const SponsoredSubmissionPhase1BodySchema = SubmissionBaseSchema.extend({
  identity_mode: z.literal('sponsored'),
  /** Base64-encoded unsigned PTB bytes from the client wallet. */
  unsignedTxBytes: z.string().min(1, 'Unsigned transaction bytes are required'),
  submitterWallet: z.string().min(1, 'Submitter wallet is required for sponsored submissions'),
});

/**
 * Sponsored submission — phase 2.
 * Client has signed the sponsored bytes; server broadcasts.
 */
export const SponsoredSubmissionPhase2BodySchema = z.object({
  identity_mode: z.literal('sponsored_complete'),
  /** Session token returned in phase 1. */
  sessionToken: z.string().min(1, 'Session token is required'),
  /** Base64-encoded fully-signed transaction bytes (client + server sig). */
  signedTxBytes: z.string().min(1, 'Signed transaction bytes are required'),
});

/**
 * Self-paid submission — wallet-connected, user pays own gas.
 * Client broadcasts independently; sends only the digest for verification.
 */
export const SelfPaidSubmissionBodySchema = SubmissionBaseSchema.extend({
  identity_mode: z.literal('self_paid'),
  /** Transaction digest from the broadcast already done by the client. */
  transactionDigest: z.string().min(1, 'Transaction digest is required'),
  submitterWallet: z.string().min(1, 'Submitter wallet is required for self-paid submissions'),
});

/**
 * Off-chain connected fallback — used only when a form has no on-chain object
 * to submit against. The submitter signs a deterministic attestation message
 * so the server can verify wallet ownership before recording the submission.
 */
export const ConnectedOffchainSubmissionBodySchema = SubmissionBaseSchema.extend({
  identity_mode: z.literal('connected_offchain'),
  submitterWallet: z.string().min(1, 'Submitter wallet is required for connected submissions'),
  signedMessage: z.string().min(1, 'Signed submission message is required'),
  signature: z.string().min(1, 'Submission signature is required'),
});

/** Discriminated union for the POST /forms/:formId/submissions body. */
export const CreateSubmissionSchema = z.discriminatedUnion('identity_mode', [
  AnonymousSubmissionBodySchema,
  SponsoredSubmissionPhase1BodySchema,
  SponsoredSubmissionPhase2BodySchema,
  SelfPaidSubmissionBodySchema,
  ConnectedOffchainSubmissionBodySchema,
]);

export type CreateSubmissionInput = z.infer<typeof CreateSubmissionSchema>;

export const UpdateSubmissionSchema = z.object({
  adminNotes: z.string().max(5000).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  isReviewed: z.boolean().optional(),
});

export const ListSubmissionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  reviewed: z.coerce.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Admins
// ---------------------------------------------------------------------------
export const AddAdminSchema = z.object({
  walletAddress: z.string().min(1, 'Wallet address is required'),
});

// ---------------------------------------------------------------------------
// AI
// ---------------------------------------------------------------------------
export const GenerateSchemaSchema = z.object({
  description: z.string().min(10, 'Provide at least 10 characters describing the form').max(2000),
});

// ---------------------------------------------------------------------------
// Uploads
// ---------------------------------------------------------------------------
export const UPLOAD_PURPOSES = ['submission', 'branding_logo', 'branding_background', 'branding_favicon'] as const;

export const CreateUploadSessionSchema = z.object({
  formId: z.string().uuid(),
  allowedMimeTypes: z.array(z.string()).min(1).default(['*/*']),
  maxFileSize: z.number().int().positive().default(10 * 1024 * 1024), // 10MB default
  uploadPurpose: z.enum(UPLOAD_PURPOSES).default('submission'),
});

export const CreateSubmissionUploadSessionSchema = z.object({
  formId: z.string().uuid(),
  fieldId: z.string().min(1).max(100),
  mimeType: z.string().min(1).default('application/octet-stream'),
  fileSize: z.number().int().positive(),
});

export const ConfirmUploadSchema = z.object({
  sessionToken: z.string().min(1),
  blobId: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Branding (re-exported from entity for convenience)
// ---------------------------------------------------------------------------
export { UpsertFormBrandingBodySchema };

// ---------------------------------------------------------------------------
// Access Policy (re-exported from entity)
// ---------------------------------------------------------------------------
export { FormAccessPolicySchema, AddAllowlistEntryBodySchema };

// ---------------------------------------------------------------------------
// Notification Preferences (Phase B)
// ---------------------------------------------------------------------------
export { UpsertNotificationPreferenceBodySchema };

export const ListAllowlistQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
});

// ---------------------------------------------------------------------------
// Common path params
// ---------------------------------------------------------------------------
export const FormIdParamSchema = z.object({
  formId: z.string().uuid(),
});

export const SubmissionIdParamSchema = z.object({
  formId: z.string().uuid(),
  submissionId: z.string().uuid(),
});

export const WalletAddressParamSchema = z.object({
  formId: z.string().uuid(),
  walletAddress: z.string().min(1),
});

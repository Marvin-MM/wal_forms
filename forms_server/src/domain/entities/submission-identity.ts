/**
 * Submission Identity Domain Types
 *
 * Mirrors the Move contract constants in submission.move:
 *   IDENTITY_ANONYMOUS          = 0
 *   IDENTITY_OPTIONAL_CONNECTED = 1
 *   IDENTITY_REQUIRED_CONNECTED = 2
 */
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Enum — matches Move contract u8 constants exactly
// ---------------------------------------------------------------------------
export const SubmissionIdentityModeEnum = z.enum([
  'anonymous',
  'optional_connected',
  'required_connected',
]);

export type SubmissionIdentityMode = z.infer<typeof SubmissionIdentityModeEnum>;

/** Map identity mode string → Move contract u8 constant. */
export const IDENTITY_MODE_TO_U8: Record<SubmissionIdentityMode, number> = {
  anonymous: 0,
  optional_connected: 1,
  required_connected: 2,
};

/** Map Move u8 constant → identity mode string. */
export const U8_TO_IDENTITY_MODE: Record<number, SubmissionIdentityMode> = {
  0: 'anonymous',
  1: 'optional_connected',
  2: 'required_connected',
};

// ---------------------------------------------------------------------------
// Value Objects
// ---------------------------------------------------------------------------

/** Encapsulates identity context attached to an incoming submission request. */
export const SubmissionIdentitySchema = z.object({
  mode: SubmissionIdentityModeEnum,
  /** Wallet address of the submitter. Null for anonymous. */
  walletAddress: z.string().nullable(),
  /** Whether the server wallet is paying gas for this submission. */
  isSponsored: z.boolean(),
});

export type SubmissionIdentity = z.infer<typeof SubmissionIdentitySchema>;

/**
 * Value object returned when the server adds gas sponsorship.
 * Carries the partially-signed transaction bytes that the client
 * must sign with their own keypair before the tx can be broadcast.
 */
export const SponsoredSubmissionSchema = z.object({
  /** Base64-encoded sponsored transaction bytes. Client must sign these. */
  sponsoredTxBytes: z.string(),
  /** Server (sponsor) wallet address for audit. */
  sponsorAddress: z.string(),
  /** Submitter wallet (if known at phase 1). */
  submitterAddress: z.string().nullable(),
  /** Session token for phase 2 correlation. */
  sessionToken: z.string(),
  /** Unix ms timestamp when this session expires (5 minutes). */
  expiresAt: z.number(),
});

export type SponsoredSubmission = z.infer<typeof SponsoredSubmissionSchema>;

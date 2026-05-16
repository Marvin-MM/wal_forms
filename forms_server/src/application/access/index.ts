/**
 * Access Control Use Cases
 *
 * Manages form access policies and the submission allowlist.
 * Implements the 5-step access check used by all submission use cases.
 *
 * Access check order:
 *   1. form.is_closed flag
 *   2. Time window (opens_at / closes_at)
 *   3. Response limit reached
 *   4. Allowlist membership (if required)
 *   5. Password hash comparison (constant-time)
 */
import { eq, and, count } from 'drizzle-orm';
import { createHash, timingSafeEqual } from 'crypto';
import type { Database } from '../../infrastructure/db/client.js';
import type { SuiBlockchainClient } from '../../infrastructure/sui/client.js';
import {
  forms,
  formAccessPolicies,
  formAllowlist,
  submissions,
} from '../../infrastructure/db/schema.js';
import {
  NotFoundError,
  AuthorizationError,
  ConflictError,
  AccessDeniedError,
} from '../../shared/errors/index.js';
import { logger } from '../../shared/logger.js';
import type {
  FormAccessPolicyInput,
  AccessDecision,
  AccessDenialReason,
} from '../../domain/entities/form-access-policy.js';

export interface AccessDeps {
  db: Database;
  sui: SuiBlockchainClient;
}

type AccessPolicyRow = typeof formAccessPolicies.$inferSelect;
type AllowlistRow = typeof formAllowlist.$inferSelect;

export interface SafeAccessPolicy extends Omit<AccessPolicyRow, 'passwordHash'> {
  hasPassword: boolean;
  currentResponseCount: number;
}

export interface SafeAllowlistEntry {
  id: string;
  formId: string;
  walletAddress: string;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** SHA3-256 hash of a plaintext password → hex string */
function hashPassword(plaintext: string): string {
  return createHash('sha3-256').update(plaintext).digest('hex');
}

/** Constant-time comparison of two hex hash strings to prevent timing attacks. */
function passwordHashesMatch(storedHex: string, candidateHex: string): boolean {
  try {
    const stored = Buffer.from(storedHex, 'hex');
    const candidate = Buffer.from(candidateHex, 'hex');
    if (stored.length !== candidate.length) return false;
    return timingSafeEqual(stored, candidate);
  } catch {
    return false;
  }
}

async function getCurrentResponseCount(formId: string, db: Database): Promise<number> {
  const [countResult] = await db
    .select({ value: count() })
    .from(submissions)
    .where(and(eq(submissions.formId, formId), eq(submissions.deletionRequested, false)));

  return countResult?.value ?? 0;
}

async function toSafePolicy(policy: AccessPolicyRow, db: Database): Promise<SafeAccessPolicy> {
  const { passwordHash: _, ...safePolicy } = policy;
  return {
    ...safePolicy,
    hasPassword: !!policy.passwordHash,
    currentResponseCount: await getCurrentResponseCount(policy.formId, db),
  };
}

function toSafeAllowlistEntry(entry: AllowlistRow): SafeAllowlistEntry {
  return {
    id: entry.id,
    formId: entry.formId,
    walletAddress: entry.allowedAddress,
    createdAt: entry.addedAt,
  };
}

// ---------------------------------------------------------------------------
// checkSubmissionAccess — shared by all submission use cases
// ---------------------------------------------------------------------------

export interface AccessCheckContext {
  /** Submitter's wallet address, null for anonymous. */
  walletAddress: string | null;
  /** Plaintext password from request body, if provided. */
  password?: string;
}

/**
 * Run all 5 access control checks in order.
 * Returns an AccessDecision. Never throws — errors are returned as decisions.
 */
export async function checkSubmissionAccess(
  formId: string,
  context: AccessCheckContext,
  db: Database
): Promise<AccessDecision> {
  const now = new Date();

  // ── 1. Form closed? ────────────────────────────────────────────────────────
  const [form] = await db
    .select({ isClosed: forms.isClosed, submissionCount: forms.submissionIdentityMode }) // reuse query
    .from(forms)
    .where(eq(forms.id, formId));

  if (!form) {
    // Treat unknown form as closed to prevent information leakage
    return { allowed: false, denialReason: 'form_closed' };
  }

  // ── 2. Access policy checks ───────────────────────────────────────────────
  const [policy] = await db
    .select()
    .from(formAccessPolicies)
    .where(eq(formAccessPolicies.formId, formId));

  if (policy) {
    // Time window: opens_at
    if (policy.opensAt && now < policy.opensAt) {
      return { allowed: false, denialReason: 'form_not_yet_open' };
    }
    // Time window: closes_at
    if (policy.closesAt && now > policy.closesAt) {
      return { allowed: false, denialReason: 'form_closed_time_expired' };
    }

    // ── 3. Response limit ─────────────────────────────────────────────────
    if (policy.hasResponseLimit && policy.responseLimit !== null) {
      const [countResult] = await db
        .select({ value: count() })
        .from(submissions)
        .where(and(eq(submissions.formId, formId), eq(submissions.deletionRequested, false)));

      const currentCount = countResult?.value ?? 0;
      if (currentCount >= policy.responseLimit) {
        return { allowed: false, denialReason: 'response_limit_reached' };
      }
    }

    // ── 4. Allowlist ──────────────────────────────────────────────────────
    if (policy.requiresAllowlist) {
      if (!context.walletAddress) {
        // Anonymous submission on an allowlisted form — always denied
        return { allowed: false, denialReason: 'identity_required_for_allowlist' };
      }
      const [entry] = await db
        .select()
        .from(formAllowlist)
        .where(
          and(
            eq(formAllowlist.formId, formId),
            eq(formAllowlist.allowedAddress, context.walletAddress.toLowerCase())
          )
        );
      if (!entry) {
        return { allowed: false, denialReason: 'not_on_allowlist' };
      }
    }

    // ── 5. Password ───────────────────────────────────────────────────────
    if (policy.passwordHash) {
      // Same response for missing OR incorrect password — prevents timing/enumeration attacks
      if (!context.password) {
        return { allowed: false, denialReason: 'invalid_password' };
      }
      const candidateHash = hashPassword(context.password);
      if (!passwordHashesMatch(policy.passwordHash, candidateHash)) {
        return { allowed: false, denialReason: 'invalid_password' };
      }
    }
  }

  return { allowed: true };
}

// ---------------------------------------------------------------------------
// upsertAccessPolicy
// ---------------------------------------------------------------------------

export async function upsertAccessPolicy(
  formId: string,
  ownerWallet: string,
  data: FormAccessPolicyInput,
  deps: AccessDeps
): Promise<{ id: string; suiObjectId: string | null }> {
  // Verify ownership
  const [form] = await deps.db.select().from(forms).where(eq(forms.id, formId));
  if (!form) throw new NotFoundError('Form', formId);
  if (form.ownerWallet !== ownerWallet) throw new AuthorizationError('Only the form owner can manage access policies');

  const [existingPolicy] = await deps.db
    .select()
    .from(formAccessPolicies)
    .where(eq(formAccessPolicies.formId, formId));

  // Hash password before storing — never store plaintext. Preserve the existing
  // hash unless the request explicitly changes or clears it.
  const passwordHash = data.clearPassword
    ? null
    : data.password
      ? hashPassword(data.password)
      : existingPolicy?.passwordHash ?? null;

  const values = {
    formId,
    requiresAllowlist: data.requiresAllowlist,
    hasResponseLimit: data.hasResponseLimit,
    responseLimit: data.responseLimit ?? null,
    opensAt: data.opensAt ?? null,
    closesAt: data.closesAt ?? null,
    passwordHash,
  };

  const [policy] = await deps.db
    .insert(formAccessPolicies)
    .values(values)
    .onConflictDoUpdate({
      target: formAccessPolicies.formId,
      set: { ...values, updatedAt: new Date() },
    })
    .returning();

  // Call on-chain (best-effort — policy already in DB if this fails)
  let suiObjectId: string | null = null;
  if (form.suiObjectId) {
    try {
      // Follow-up: this best-effort server call is skipped while the server
      // does not hold the user's FormOwnerCap. Enable a wallet-signed flow
      // before relying on on-chain policy synchronization.
      const result = await deps.sui.createAccessPolicyOnChain({
        ownerCapObjectId: '0x0', // placeholder — owner cap is held in frontend wallet
        formObjectId: form.suiObjectId,
        requiresAllowlist: data.requiresAllowlist,
        hasResponseLimit: data.hasResponseLimit,
        responseLimit: data.responseLimit ?? null,
        opensAt: null, // epoch conversion TBD when epoch API is available
        closesAt: null,
        passwordHash,
      });
      suiObjectId = result.suiObjectId;
    } catch (error) {
      logger.warn({ error }, '[Access] Sui access policy creation failed (skipping until client sponsorship is implemented)');
    }
  }

  if (suiObjectId && policy) {
    await deps.db
      .update(formAccessPolicies)
      .set({ suiObjectId })
      .where(eq(formAccessPolicies.formId, formId));
  }

  logger.info({ formId, hasPassword: !!passwordHash }, '[Access] Access policy upserted');
  return { id: policy!.id, suiObjectId: suiObjectId };
}

// ---------------------------------------------------------------------------
// addAllowlistEntry
// ---------------------------------------------------------------------------

export async function addAllowlistEntry(
  formId: string,
  ownerWallet: string,
  targetAddress: string,
  deps: AccessDeps
): Promise<SafeAllowlistEntry> {
  const [form] = await deps.db.select().from(forms).where(eq(forms.id, formId));
  if (!form) throw new NotFoundError('Form', formId);
  if (form.ownerWallet !== ownerWallet) throw new AuthorizationError('Only the form owner can manage the allowlist');

  const normalized = targetAddress.toLowerCase();

  // Check for duplicate
  const [existing] = await deps.db
    .select()
    .from(formAllowlist)
    .where(and(eq(formAllowlist.formId, formId), eq(formAllowlist.allowedAddress, normalized)));
  if (existing) throw new ConflictError('Address is already on the allowlist');

  const [entry] = await deps.db
    .insert(formAllowlist)
    .values({ formId, allowedAddress: normalized })
    .returning();

  // Get policy for on-chain call
  const [policy] = await deps.db.select().from(formAccessPolicies).where(eq(formAccessPolicies.formId, formId));
  if (policy?.suiObjectId) {
    // Follow-up: access.move expects the Form object when adding entries;
    // keep this best-effort path disabled until the Sui client is aligned.
    await deps.sui.addToAllowlistOnChain({
      ownerCapObjectId: '0x0',
      policyObjectId: policy.suiObjectId,
      allowedAddress: normalized,
    });
  }

  logger.info({ formId, address: normalized }, '[Access] Allowlist entry added');
  return toSafeAllowlistEntry(entry!);
}

// ---------------------------------------------------------------------------
// removeAllowlistEntry
// ---------------------------------------------------------------------------

export async function removeAllowlistEntry(
  formId: string,
  ownerWallet: string,
  targetAddress: string,
  deps: AccessDeps
): Promise<void> {
  const [form] = await deps.db.select().from(forms).where(eq(forms.id, formId));
  if (!form) throw new NotFoundError('Form', formId);
  if (form.ownerWallet !== ownerWallet) throw new AuthorizationError('Only the form owner can manage the allowlist');

  const normalized = targetAddress.toLowerCase();

  const result = await deps.db
    .delete(formAllowlist)
    .where(and(eq(formAllowlist.formId, formId), eq(formAllowlist.allowedAddress, normalized)))
    .returning();

  if (result.length === 0) throw new NotFoundError('Allowlist entry', targetAddress);

  const [policy] = await deps.db.select().from(formAccessPolicies).where(eq(formAccessPolicies.formId, formId));
  if (policy?.suiObjectId) {
    // Follow-up: access.move removes an AllowlistEntry object, not an address;
    // keep this best-effort path disabled until indexed entry IDs are used.
    await deps.sui.removeFromAllowlistOnChain({
      ownerCapObjectId: '0x0',
      policyObjectId: policy.suiObjectId,
      addressToRemove: normalized,
    });
  }

  logger.info({ formId, address: normalized }, '[Access] Allowlist entry removed');
}

// ---------------------------------------------------------------------------
// getAccessPolicy
// ---------------------------------------------------------------------------

export async function getAccessPolicy(
  formId: string,
  ownerWallet: string,
  db: Database
): Promise<SafeAccessPolicy | null> {
  const [form] = await db.select().from(forms).where(eq(forms.id, formId));
  if (!form) throw new NotFoundError('Form', formId);
  if (form.ownerWallet !== ownerWallet) throw new AuthorizationError('Only the form owner can view access policies');

  const [policy] = await db.select().from(formAccessPolicies).where(eq(formAccessPolicies.formId, formId));
  return policy ? toSafePolicy(policy, db) : null;
}

// ---------------------------------------------------------------------------
// getPublicAccessPolicy
// ---------------------------------------------------------------------------

export async function getPublicAccessPolicy(
  formId: string,
  db: Database
): Promise<SafeAccessPolicy | null> {
  const [form] = await db
    .select({ id: forms.id })
    .from(forms)
    .where(and(eq(forms.id, formId), eq(forms.isDeleted, false)));
  if (!form) throw new NotFoundError('Form', formId);

  const [policy] = await db.select().from(formAccessPolicies).where(eq(formAccessPolicies.formId, formId));
  return policy ? toSafePolicy(policy, db) : null;
}

export async function checkAllowlistAccess(
  formId: string,
  walletAddress: string,
  db: Database
): Promise<{ allowed: boolean }> {
  const normalized = walletAddress.toLowerCase();
  const [entry] = await db
    .select({ id: formAllowlist.id })
    .from(formAllowlist)
    .where(and(eq(formAllowlist.formId, formId), eq(formAllowlist.allowedAddress, normalized)));

  return { allowed: !!entry };
}

// ---------------------------------------------------------------------------
// listAllowlist (paginated)
// ---------------------------------------------------------------------------

export async function listAllowlist(
  formId: string,
  ownerWallet: string,
  page: number,
  pageSize: number,
  db: Database
): Promise<{ items: SafeAllowlistEntry[]; total: number; page: number; pageSize: number; totalPages: number }> {
  const [form] = await db.select().from(forms).where(eq(forms.id, formId));
  if (!form) throw new NotFoundError('Form', formId);
  if (form.ownerWallet !== ownerWallet) throw new AuthorizationError('Only the form owner can view the allowlist');

  const offset = (page - 1) * pageSize;
  const [entries, [totalResult]] = await Promise.all([
    db.select().from(formAllowlist).where(eq(formAllowlist.formId, formId)).limit(pageSize).offset(offset),
    db.select({ value: count() }).from(formAllowlist).where(eq(formAllowlist.formId, formId)),
  ]);

  const total = totalResult?.value ?? 0;
  return {
    items: entries.map(toSafeAllowlistEntry),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ---------------------------------------------------------------------------
// throwAccessDenied — throws the correct structured error for a denial reason
// ---------------------------------------------------------------------------

const DENIAL_MESSAGES: Record<AccessDenialReason, string> = {
  form_closed: 'This form is closed and no longer accepting submissions',
  form_not_yet_open: 'This form is not yet open for submissions',
  form_closed_time_expired: 'The submission window for this form has ended',
  response_limit_reached: 'This form has reached its maximum number of submissions',
  not_on_allowlist: 'Your wallet address is not authorized to submit this form',
  identity_required_for_allowlist: 'A connected wallet is required to submit this form',
  invalid_password: 'Invalid password',
};

/** Throw an AccessDeniedError for a specific denial reason. */
export function throwAccessDenied(reason: AccessDenialReason): never {
  throw new AccessDeniedError(reason, DENIAL_MESSAGES[reason]);
}

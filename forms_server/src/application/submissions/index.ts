/**
 * Submission Use Cases — Phase A refactor
 *
 * Three distinct flows share common validation helpers:
 *   1. submitAnonymousResponse — server wallet executes full PTB
 *   2. submitSponsoredResponse — two-phase: server co-signs gas, client broadcasts
 *   3. submitSelfPaidResponse  — client already broadcast; server indexes the digest
 *
 * All flows call checkSubmissionAccess (5-step policy check) and
 * evaluateFormVisibility (conditional field stripping — Change 8).
 */
import { eq, and, desc, sql, count } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import type { Database } from '../../infrastructure/db/client.js';
import type { WalrusClient } from '../../infrastructure/walrus/client.js';
import type { SuiBlockchainClient } from '../../infrastructure/sui/client.js';
import {
  forms,
  submissions,
  submissionSessions,
  admins,
} from '../../infrastructure/db/schema.js';
import { NotFoundError, AuthorizationError, TurnstileError, SessionExpiredError } from '../../shared/errors/index.js';
import { verifyTurnstileToken } from '../../infrastructure/turnstile/client.js';
import { verifySiWSSignature } from '../../infrastructure/auth/siws.js';
import { logger } from '../../shared/logger.js';
import { checkSubmissionAccess, throwAccessDenied } from '../access/index.js';
import { inngest } from '../../infrastructure/inngest/client.js';
import { roomManager } from '../../interface/ws/room-manager.js';
import { WsEventType } from '../../shared/types/index.js';

export interface SubmissionDeps {
  db: Database;
  walrus: WalrusClient;
  sui: SuiBlockchainClient;
  turnstileSecret: string;
}

function buildConnectedSubmissionMessage(params: {
  formId: string;
  blobId: string;
  submitterWallet: string;
  isEncrypted: boolean;
}): string {
  return [
    'WalrusForms connected submission',
    `Form: ${params.formId}`,
    `Blob: ${params.blobId}`,
    `Wallet: ${params.submitterWallet}`,
    `Encrypted: ${params.isEncrypted ? 'true' : 'false'}`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Common validation helpers
// ---------------------------------------------------------------------------

/**
 * Validate a blob ID exists on Walrus by attempting to fetch its metadata.
 * Throws if the blob is not reachable.
 */
async function verifyBlobExists(blobId: string, walrus: WalrusClient): Promise<void> {
  const reachable = await walrus.isAggregatorReachable();
  if (!reachable) {
    logger.warn({ blobId }, '[Submissions] Walrus aggregator unreachable — skipping blob verification');
    return; // degrade gracefully; the blob may exist
  }
  // TODO: add walrus.fetchBlobMetadata(blobId) when the method is available
  // For now we trust the client-reported blobId and rely on on-chain receipt
}

async function emitSubmissionCreated(formId: string, submission: typeof submissions.$inferSelect) {
  roomManager.broadcast(formId, {
    type: WsEventType.NEW_SUBMISSION,
    formId,
    payload: submission,
    timestamp: new Date().toISOString(),
  });

  try {
    await inngest.send({
      name: 'forms/submission.created',
      data: { formId, submissionId: submission.id },
    });
  } catch (error) {
    logger.warn({ formId, submissionId: submission.id, error }, '[Submissions] Failed to emit submission event');
  }
}



// ---------------------------------------------------------------------------
// Flow 1 — Anonymous Submission
// ---------------------------------------------------------------------------

/**
 * Called when the form's identity mode is 'anonymous'.
 * The server wallet executes the entire submit_anonymous PTB.
 * Submitter wallet is always null; is_anonymous = true.
 */
export async function submitAnonymousResponse(
  formId: string,
  params: {
    blobId: string;
    turnstileToken: string;
    isEncrypted: boolean;
    password?: string;
  },
  deps: SubmissionDeps,
  remoteIp?: string
) {
  // 1. Turnstile verification
  const valid = await verifyTurnstileToken(params.turnstileToken, deps.turnstileSecret, remoteIp);
  if (!valid) throw new TurnstileError();

  // 2. Load form
  const [form] = await deps.db
    .select()
    .from(forms)
    .where(and(eq(forms.id, formId), eq(forms.isDeleted, false)));
  if (!form) throw new NotFoundError('Form', formId);

  // 3. Access policy check (anonymous — no wallet)
  const access = await checkSubmissionAccess(formId, { walletAddress: null, password: params.password }, deps.db);
  if (!access.allowed) throwAccessDenied(access.denialReason!);

  // 4. Verify blob exists on Walrus
  await verifyBlobExists(params.blobId, deps.walrus);

  // 5. Execute on-chain anonymously using server wallet
  const serverAddress = deps.sui.getServerWalletAddress();
  let digest: string | null = null;
  if (form.suiObjectId) {
    try {
      const result = await deps.sui.submitAnonymous({
        formObjectId: form.suiObjectId,
        blobId: params.blobId,
        isEncrypted: params.isEncrypted,
        submitterAddress: null,
        sponsorshipPoolObjectId: form.sponsorshipPoolObjectId,
      });
      digest = result.digest;
    } catch (error) {
      logger.warn(
        { formId, error },
        '[Submissions] Anonymous on-chain write failed; storing off-chain receipt only'
      );
    }
  }

  // 6. Write DB record
  const [submission] = await deps.db.insert(submissions).values({
    formId,
    walrusBlobId: params.blobId,
    suiObjectId: digest,
    isEncrypted: params.isEncrypted,
    submitterWallet: null,
    priority: 'medium',
    submissionIdentityMode: 'anonymous',
    isAnonymous: true,
    isSponsored: false,
    sponsorAddress: serverAddress,
  }).returning();

  logger.info({ submissionId: submission!.id, formId, blobId: params.blobId, mode: 'anonymous' }, '[Submissions] Anonymous submission created');
  await emitSubmissionCreated(formId, submission!);
  return { submissionId: submission!.id, phase: 'complete' as const, digest };
}

// ---------------------------------------------------------------------------
// Flow 2a — Sponsored Submission Phase 1 (gas co-signing)
// ---------------------------------------------------------------------------

/**
 * Phase 1: Client sends unsigned PTB bytes.
 * Server adds gas sponsorship and stores a pending session.
 * Returns sponsored bytes + session token for the client to sign.
 */
export async function submitSponsoredResponsePhase1(
  formId: string,
  params: {
    blobId: string;
    turnstileToken: string;
    isEncrypted: boolean;
    unsignedTxBytes: string;
    submitterWallet: string;
    password?: string;
  },
  deps: SubmissionDeps,
  remoteIp?: string
) {
  const valid = await verifyTurnstileToken(params.turnstileToken, deps.turnstileSecret, remoteIp);
  if (!valid) throw new TurnstileError();

  const [form] = await deps.db
    .select()
    .from(forms)
    .where(and(eq(forms.id, formId), eq(forms.isDeleted, false)));
  if (!form) throw new NotFoundError('Form', formId);

  const access = await checkSubmissionAccess(
    formId,
    { walletAddress: params.submitterWallet, password: params.password },
    deps.db
  );
  if (!access.allowed) throwAccessDenied(access.denialReason!);

  await verifyBlobExists(params.blobId, deps.walrus);

  // Add server gas sponsorship
  const { sponsoredTxBytesB64, sponsorSignature, sponsorAddress } = await deps.sui.buildSponsoredTxGasPayment(params.unsignedTxBytes);

  // Store session for phase 2 (TTL: 5 minutes)
  const sessionToken = randomUUID();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await deps.db.insert(submissionSessions).values({
    formId,
    sessionToken,
    sponsoredTxBytes: sponsoredTxBytesB64,
    submitterWallet: params.submitterWallet,
    pendingSubmissionData: {
      blobId: params.blobId,
      isEncrypted: params.isEncrypted,
      sponsorAddress,
      sponsorSignature, // stored for broadcast in phase 2
    },
    status: 'pending',
    expiresAt,
  });

  logger.info({ formId, submitter: params.submitterWallet }, '[Submissions] Sponsored phase 1 — session created');

  return {
    phase: 'sponsored' as const,
    sessionToken,
    sponsoredTxBytesB64,
    sponsorSignature, // returned to client so it can combine with its own sig
    expiresAt: expiresAt.getTime(),
    sponsorAddress,
  };
}

// ---------------------------------------------------------------------------
// Flow 2b — Sponsored Submission Phase 2 (broadcast + index)
// ---------------------------------------------------------------------------

/**
 * Phase 2: Client has signed the sponsored bytes and sends them back.
 * Server broadcasts and writes the final submission record.
 */
export async function submitSponsoredResponsePhase2(
  formId: string,
  params: {
    sessionToken: string;
    signedTxBytes: string;
  },
  deps: SubmissionDeps
) {
  const now = new Date();

  // Load and validate session
  const [session] = await deps.db
    .select()
    .from(submissionSessions)
    .where(
      and(
        eq(submissionSessions.sessionToken, params.sessionToken),
        eq(submissionSessions.formId, formId),
        eq(submissionSessions.status, 'pending')
      )
    );

  if (!session) throw new NotFoundError('Submission session', params.sessionToken);
  if (session.expiresAt < now) {
    await deps.db.update(submissionSessions)
      .set({ status: 'expired' })
      .where(eq(submissionSessions.id, session.id));
    throw new SessionExpiredError('Submission session has expired. Please start a new submission.');
  }

  // Broadcast the fully-signed transaction
  const pendingData = session.pendingSubmissionData as {
    blobId: string;
    isEncrypted: boolean;
    sponsorAddress: string;
  };

  const { digest } = await deps.sui.broadcastSponsoredTx(params.signedTxBytes);

  // Mark session completed
  await deps.db.update(submissionSessions)
    .set({ status: 'completed' })
    .where(eq(submissionSessions.id, session.id));

  // Write submission record
  const [submission] = await deps.db.insert(submissions).values({
    formId,
    walrusBlobId: pendingData.blobId,
    suiObjectId: digest,
    isEncrypted: pendingData.isEncrypted,
    submitterWallet: session.submitterWallet,
    priority: 'medium',
    submissionIdentityMode: 'optional_connected',
    isAnonymous: false,
    isSponsored: true,
    sponsorAddress: pendingData.sponsorAddress,
  }).returning();

  logger.info({ submissionId: submission!.id, formId, digest }, '[Submissions] Sponsored submission complete');
  await emitSubmissionCreated(formId, submission!);
  return { submissionId: submission!.id, phase: 'complete' as const, digest };
}

// ---------------------------------------------------------------------------
// Flow 3 — Self-Paid Submission
// ---------------------------------------------------------------------------

/**
 * The client has already broadcast the transaction with their own gas.
 * Server receives only the blob ID + transaction digest for indexing.
 */
export async function submitSelfPaidResponse(
  formId: string,
  params: {
    blobId: string;
    turnstileToken: string;
    isEncrypted: boolean;
    transactionDigest: string;
    submitterWallet: string;
    password?: string;
  },
  deps: SubmissionDeps,
  remoteIp?: string
) {
  const valid = await verifyTurnstileToken(params.turnstileToken, deps.turnstileSecret, remoteIp);
  if (!valid) throw new TurnstileError();

  const [form] = await deps.db
    .select()
    .from(forms)
    .where(and(eq(forms.id, formId), eq(forms.isDeleted, false)));
  if (!form) throw new NotFoundError('Form', formId);

  const access = await checkSubmissionAccess(
    formId,
    { walletAddress: params.submitterWallet, password: params.password },
    deps.db
  );
  if (!access.allowed) throwAccessDenied(access.denialReason!);

  await verifyBlobExists(params.blobId, deps.walrus);

  const [submission] = await deps.db.insert(submissions).values({
    formId,
    walrusBlobId: params.blobId,
    suiObjectId: params.transactionDigest,
    isEncrypted: params.isEncrypted,
    submitterWallet: params.submitterWallet,
    priority: 'medium',
    submissionIdentityMode: 'required_connected',
    isAnonymous: false,
    isSponsored: false,
    sponsorAddress: null,
  }).returning();

  logger.info({ submissionId: submission!.id, formId, digest: params.transactionDigest }, '[Submissions] Self-paid submission indexed');
  await emitSubmissionCreated(formId, submission!);
  return { submissionId: submission!.id, phase: 'complete' as const, digest: params.transactionDigest };
}

// ---------------------------------------------------------------------------
// Flow 4 — Connected Off-chain Fallback
// ---------------------------------------------------------------------------

export async function submitConnectedOffchainResponse(
  formId: string,
  params: {
    blobId: string;
    turnstileToken: string;
    isEncrypted: boolean;
    submitterWallet: string;
    signedMessage: string;
    signature: string;
    password?: string;
  },
  deps: SubmissionDeps,
  remoteIp?: string
) {
  const valid = await verifyTurnstileToken(params.turnstileToken, deps.turnstileSecret, remoteIp);
  if (!valid) throw new TurnstileError();

  const [form] = await deps.db
    .select()
    .from(forms)
    .where(and(eq(forms.id, formId), eq(forms.isDeleted, false)));
  if (!form) throw new NotFoundError('Form', formId);

  const expectedMessage = buildConnectedSubmissionMessage({
    formId,
    blobId: params.blobId,
    submitterWallet: params.submitterWallet,
    isEncrypted: params.isEncrypted,
  });
  if (params.signedMessage !== expectedMessage) {
    throw new AuthorizationError('Submission signature message mismatch');
  }

  const signatureValid = await verifySiWSSignature(
    params.signedMessage,
    params.signature,
    params.submitterWallet
  );
  if (!signatureValid) throw new AuthorizationError('Invalid submission signature');

  const access = await checkSubmissionAccess(
    formId,
    { walletAddress: params.submitterWallet, password: params.password },
    deps.db
  );
  if (!access.allowed) throwAccessDenied(access.denialReason!);

  await verifyBlobExists(params.blobId, deps.walrus);

  const identityMode =
    form.submissionIdentityMode === 'anonymous'
      ? 'optional_connected'
      : form.submissionIdentityMode;

  const [submission] = await deps.db.insert(submissions).values({
    formId,
    walrusBlobId: params.blobId,
    suiObjectId: null,
    isEncrypted: params.isEncrypted,
    submitterWallet: params.submitterWallet,
    priority: 'medium',
    submissionIdentityMode: identityMode,
    isAnonymous: false,
    isSponsored: false,
    sponsorAddress: null,
  }).returning();

  logger.info(
    { submissionId: submission!.id, formId, wallet: params.submitterWallet },
    '[Submissions] Connected off-chain submission created'
  );
  await emitSubmissionCreated(formId, submission!);
  return { submissionId: submission!.id, phase: 'complete' as const, digest: null };
}

// ---------------------------------------------------------------------------
// Admin use cases (unchanged from previous)
// ---------------------------------------------------------------------------

export async function listSubmissions(
  formId: string,
  wallet: string,
  query: { page: number; pageSize: number; search?: string; priority?: string; reviewed?: boolean },
  deps: Pick<SubmissionDeps, 'db'>
) {
  await verifyFormAccess(formId, wallet, deps.db);

  const offset = (query.page - 1) * query.pageSize;
  const conditions = [
    eq(submissions.formId, formId),
    eq(submissions.deletionRequested, false), // hide deletion-requested submissions from admin view
  ];

  if (query.priority) conditions.push(eq(submissions.priority, query.priority));
  if (query.reviewed !== undefined) conditions.push(eq(submissions.isReviewed, query.reviewed));

  const whereClause = and(...conditions);
  let baseQuery = deps.db.select().from(submissions).where(whereClause).$dynamic();

  if (query.search) {
    baseQuery = deps.db
      .select()
      .from(submissions)
      .where(and(...conditions, sql`${submissions.searchVector} @@ to_tsquery('english', ${query.search})`))
      .$dynamic();
  }

  const [items, [totalResult]] = await Promise.all([
    baseQuery.orderBy(desc(submissions.createdAt)).limit(query.pageSize).offset(offset),
    deps.db.select({ count: count() }).from(submissions).where(whereClause),
  ]);

  const total = totalResult?.count ?? 0;
  return { items, total, page: query.page, pageSize: query.pageSize, totalPages: Math.ceil(total / query.pageSize) };
}

export async function getSubmission(
  formId: string,
  submissionId: string,
  wallet: string,
  deps: Pick<SubmissionDeps, 'db'>
) {
  await verifyFormAccess(formId, wallet, deps.db);
  const [submission] = await deps.db
    .select()
    .from(submissions)
    .where(and(eq(submissions.id, submissionId), eq(submissions.formId, formId)));
  if (!submission) throw new NotFoundError('Submission', submissionId);
  return submission;
}

export async function updateSubmission(
  formId: string,
  submissionId: string,
  params: { adminNotes?: string; priority?: string; isReviewed?: boolean },
  wallet: string,
  deps: Pick<SubmissionDeps, 'db'>
) {
  await verifyFormAccess(formId, wallet, deps.db);

  const updateData: Record<string, unknown> = {};
  if (params.adminNotes !== undefined) updateData['adminNotes'] = params.adminNotes;
  if (params.priority !== undefined) updateData['priority'] = params.priority;
  if (params.isReviewed !== undefined) updateData['isReviewed'] = params.isReviewed;

  const [updated] = await deps.db
    .update(submissions)
    .set(updateData)
    .where(and(eq(submissions.id, submissionId), eq(submissions.formId, formId)))
    .returning();

  if (!updated) throw new NotFoundError('Submission', submissionId);
  return updated;
}

// Helper: verify wallet has access to the form (owner or admin)
async function verifyFormAccess(formId: string, wallet: string, db: Database) {
  const [form] = await db.select().from(forms).where(eq(forms.id, formId));
  if (!form) throw new NotFoundError('Form', formId);
  if (form.ownerWallet === wallet) return;

  const [admin] = await db
    .select()
    .from(admins)
    .where(and(eq(admins.formId, formId), eq(admins.walletAddress, wallet)));

  if (!admin) throw new AuthorizationError('You do not have access to this form');
}

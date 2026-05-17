/**
 * Admin use cases: add, remove, list.
 *
 * Seal allowlist note:
 * The allowlist is enforced on-chain via your Move contract's `seal_approve`
 * function. The DATABASE is the canonical source of truth for who is an admin.
 * The Seal SDK on the CLIENT side calls your contract to verify membership
 * before the key server grants decryption access. The server does NOT call
 * Seal key servers directly — that is a client-side operation.
 */
import { eq, and } from 'drizzle-orm';
import type { Database } from '../../infrastructure/db/client.js';
import type { SealClient } from '../../infrastructure/seal/client.js';
import { forms, admins } from '../../infrastructure/db/schema.js';
import { NotFoundError, AuthorizationError, ConflictError } from '../../shared/errors/index.js';
import { logger } from '../../shared/logger.js';

export interface AdminDeps {
  db: Database;
  seal: SealClient;
}

async function verifyOwnerOrAdmin(formId: string, wallet: string, db: Database) {
  const [form] = await db.select().from(forms).where(eq(forms.id, formId));
  if (!form) throw new NotFoundError('Form', formId);

  if (form.ownerWallet !== wallet) {
    const isAdmin = await db
      .select({ id: admins.id })
      .from(admins)
      .where(and(eq(admins.formId, formId), eq(admins.walletAddress, wallet)))
      .limit(1);

    if (isAdmin.length === 0) {
      throw new AuthorizationError('Only the form owner or an admin can manage admins');
    }
  }
  return form;
}

export async function addAdmin(
  formId: string,
  walletAddress: string,
  ownerWallet: string,
  deps: AdminDeps
) {
  await verifyOwnerOrAdmin(formId, ownerWallet, deps.db);

  // Check if already an admin
  const [existing] = await deps.db
    .select()
    .from(admins)
    .where(and(eq(admins.formId, formId), eq(admins.walletAddress, walletAddress)));

  if (existing) {
    throw new ConflictError('Address is already an admin for this form');
  }

  const [admin] = await deps.db.insert(admins).values({
    formId,
    walletAddress,
  }).returning();

  // The on-chain allowlist is updated by the OWNER's wallet via the frontend
  // using @mysten/seal + your Move contract. The server tracks it in DB only.
  logger.info({ formId, walletAddress }, '[Admins] Admin added');
  return admin;
}

export async function removeAdmin(
  formId: string,
  walletAddress: string,
  ownerWallet: string,
  deps: AdminDeps
) {
  await verifyOwnerOrAdmin(formId, ownerWallet, deps.db);

  const result = await deps.db
    .delete(admins)
    .where(and(eq(admins.formId, formId), eq(admins.walletAddress, walletAddress)))
    .returning();

  if (result.length === 0) {
    throw new NotFoundError('Admin', walletAddress);
  }

  logger.info({ formId, walletAddress }, '[Admins] Admin removed');
}

export async function listAdmins(
  formId: string,
  ownerWallet: string,
  deps: Pick<AdminDeps, 'db'>
) {
  await verifyOwnerOrAdmin(formId, ownerWallet, deps.db);

  return deps.db
    .select()
    .from(admins)
    .where(eq(admins.formId, formId));
}

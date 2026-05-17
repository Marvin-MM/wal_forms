/**
 * Submitter application layer.
 * Manages user profiles and CSV exports.
 */
import { eq, desc } from 'drizzle-orm';
import type { Database } from '../../infrastructure/db/client.js';
import { exportJobs, forms } from '../../infrastructure/db/schema.js';
import { NotFoundError } from '../../shared/errors/index.js';
import { logger } from '../../shared/logger.js';
import { verifyOwnerOrAdmin } from '../forms/index.js';
import { getPlatformAccount } from '../economics/index.js';

export interface SubmitterDeps {
  db: Database;
}

export async function getSubmitterProfile(walletAddress: string, deps: SubmitterDeps) {
  const account = await getPlatformAccount(walletAddress, deps);
  return account;
}

export async function requestCsvExport(formId: string, walletAddress: string, deps: SubmitterDeps) {
  // 1. Verify ownership
  const [form] = await deps.db.select().from(forms).where(eq(forms.id, formId));
  if (!form) throw new NotFoundError('Form', formId);
  await verifyOwnerOrAdmin(form, walletAddress, deps.db);

  // 2. Create export job
  const [job] = await deps.db
    .insert(exportJobs)
    .values({
      formId,
      status: 'pending',
    })
    .returning();

  logger.info({ formId, jobId: job!.id }, '[Submitter] CSV export requested');

  // Note: We use Inngest directly or fire an event. For now, we assume the system polls 
  // pending exportJobs, or we can send an Inngest event if we pass the client in.
  
  return job!;
}

export async function getExportJobs(formId: string, walletAddress: string, deps: SubmitterDeps) {
  // 1. Verify ownership
  const [form] = await deps.db.select().from(forms).where(eq(forms.id, formId));
  if (!form) throw new NotFoundError('Form', formId);
  await verifyOwnerOrAdmin(form, walletAddress, deps.db);

  return await deps.db
    .select()
    .from(exportJobs)
    .where(eq(exportJobs.formId, formId))
    .orderBy(desc(exportJobs.createdAt));
}

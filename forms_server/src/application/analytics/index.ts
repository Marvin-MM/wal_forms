/**
 * Analytics application layer.
 * Fetches analytics snapshots for forms.
 */
import { and, eq, desc } from 'drizzle-orm';
import type { Database } from '../../infrastructure/db/client.js';
import { admins, forms, analyticsSnapshots } from '../../infrastructure/db/schema.js';
import { NotFoundError, AuthorizationError } from '../../shared/errors/index.js';

export interface AnalyticsDeps {
  db: Database;
}

export async function getFormAnalytics(
  formId: string,
  walletAddress: string,
  limit: number = 30,
  deps: AnalyticsDeps
) {
  // 1. Verify ownership
  const [form] = await deps.db.select({ ownerWallet: forms.ownerWallet }).from(forms).where(eq(forms.id, formId));
  if (!form) throw new NotFoundError('Form', formId);
  if (form.ownerWallet !== walletAddress) {
    const [admin] = await deps.db
      .select({ id: admins.id })
      .from(admins)
      .where(and(eq(admins.formId, formId), eq(admins.walletAddress, walletAddress)));
    if (!admin) throw new AuthorizationError('You do not have access to analytics for this form');
  }

  // 2. Fetch recent daily snapshots
  const snapshots = await deps.db
    .select()
    .from(analyticsSnapshots)
    .where(eq(analyticsSnapshots.formId, formId))
    .orderBy(desc(analyticsSnapshots.periodStart))
    .limit(limit);

  return snapshots;
}

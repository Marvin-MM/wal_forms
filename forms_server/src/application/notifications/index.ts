/**
 * Notifications application layer.
 * Manages notification preferences for forms.
 */
import { eq } from 'drizzle-orm';
import type { Database } from '../../infrastructure/db/client.js';
import { forms, notificationPreferences } from '../../infrastructure/db/schema.js';
import { NotFoundError, AuthorizationError } from '../../shared/errors/index.js';
import { logger } from '../../shared/logger.js';
import { UpsertNotificationPreferenceBodySchema, type UpsertNotificationPreferenceBody } from '../../domain/entities/notification-preference.js';

export interface NotificationDeps {
  db: Database;
}

export async function getNotificationPreferences(
  formId: string,
  walletAddress: string,
  deps: NotificationDeps
) {
  // 1. Verify ownership
  const [form] = await deps.db.select({ ownerWallet: forms.ownerWallet }).from(forms).where(eq(forms.id, formId));
  if (!form) throw new NotFoundError('Form', formId);
  if (form.ownerWallet !== walletAddress) {
    throw new AuthorizationError('Only the form owner can manage notification preferences');
  }

  // 2. Fetch preferences
  const [prefs] = await deps.db.select().from(notificationPreferences).where(eq(notificationPreferences.formId, formId));
  return prefs ?? null;
}

export async function upsertNotificationPreferences(
  formId: string,
  walletAddress: string,
  data: UpsertNotificationPreferenceBody,
  deps: NotificationDeps
) {
  // 1. Verify ownership
  const [form] = await deps.db.select({ ownerWallet: forms.ownerWallet }).from(forms).where(eq(forms.id, formId));
  if (!form) throw new NotFoundError('Form', formId);
  if (form.ownerWallet !== walletAddress) {
    throw new AuthorizationError('Only the form owner can manage notification preferences');
  }

  // 2. Validate
  const validated = UpsertNotificationPreferenceBodySchema.parse(data);

  // 3. Upsert
  const [result] = await deps.db
    .insert(notificationPreferences)
    .values({
      formId,
      ...validated,
    })
    .onConflictDoUpdate({
      target: notificationPreferences.formId,
      set: {
        ...validated,
        updatedAt: new Date(),
      },
    })
    .returning();

  logger.info({ formId }, '[Notifications] Preferences updated');
  return result!;
}

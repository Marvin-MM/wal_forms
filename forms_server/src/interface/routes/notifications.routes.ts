/**
 * Notification preferences API routes.
 */
import { Elysia } from 'elysia';
import { getNotificationPreferences, upsertNotificationPreferences } from '../../application/notifications/index.js';
import {
  WalletAddressParamSchema,
  UpsertNotificationPreferenceBodySchema,
} from '../../domain/schemas/request-schemas.js';
import type { Database } from '../../infrastructure/db/client.js';

export function createNotificationRoutes(db: Database) {
  return new Elysia()
    // Decorate with dependencies
    .decorate('db', db)

  // GET /forms/:formId/notifications/preferences/:walletAddress
  .get(
    '/forms/:formId/notifications/preferences/:walletAddress',
    async ({ params, db }) => {
      const { formId, walletAddress } = WalletAddressParamSchema.parse(params);
      const prefs = await getNotificationPreferences(formId, walletAddress, { db });
      return { success: true, data: prefs };
    }
  )

  // PUT /forms/:formId/notifications/preferences/:walletAddress
  .put(
    '/forms/:formId/notifications/preferences/:walletAddress',
    async ({ params, body, db }) => {
      const { formId, walletAddress } = WalletAddressParamSchema.parse(params);
      const validatedBody = UpsertNotificationPreferenceBodySchema.parse(body);
      
      const prefs = await upsertNotificationPreferences(formId, walletAddress, validatedBody, { db });
      return { success: true, data: prefs };
    }
  );
}

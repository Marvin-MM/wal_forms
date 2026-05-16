/**
 * Analytics API routes.
 */
import { Elysia } from 'elysia';
import { getFormAnalytics } from '../../application/analytics/index.js';
import { WalletAddressParamSchema } from '../../domain/schemas/request-schemas.js';
import type { Database } from '../../infrastructure/db/client.js';

export function createAnalyticsRoutes(db: Database) {
  return new Elysia()
    // Decorate with dependencies
    .decorate('db', db)

  // GET /forms/:formId/analytics/:walletAddress
  .get(
    '/forms/:formId/analytics/:walletAddress',
    async ({ params, query, db }) => {
      const { formId, walletAddress } = WalletAddressParamSchema.parse(params);
      const limit = query.limit ? parseInt(String(query.limit), 10) : 30;
      
      const snapshots = await getFormAnalytics(formId, walletAddress, limit, { db });
      return { success: true, data: snapshots };
    }
  );
}

/**
 * Analytics API routes.
 */
import { Elysia } from 'elysia';
import { getFormAnalytics } from '../../application/analytics/index.js';
import { FormIdParamSchema } from '../../domain/schemas/request-schemas.js';
import type { Database } from '../../infrastructure/db/client.js';
import { createAuthMiddleware } from '../middleware/auth.middleware.js';
import { successResponse } from '../middleware/error-handler.js';
import type { JwtService } from '../../infrastructure/auth/jwt.js';

export function createAnalyticsRoutes(jwtService: JwtService, db: Database) {
  const authPlugin = createAuthMiddleware(jwtService);

  return new Elysia()
    .use(authPlugin)
    .decorate('db', db)

  // GET /forms/:formId/analytics
  .get(
    '/forms/:formId/analytics',
    async ({ params, query, db, auth }) => {
      const { formId } = FormIdParamSchema.parse(params);
      const limit = query.limit ? parseInt(String(query.limit), 10) : 30;
      
      const snapshots = await getFormAnalytics(formId, auth.wallet, limit, { db });
      return successResponse(snapshots);
    }
  );
}

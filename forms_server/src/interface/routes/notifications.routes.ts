/**
 * Notification preferences API routes.
 */
import { Elysia } from 'elysia';
import { getNotificationPreferences, upsertNotificationPreferences } from '../../application/notifications/index.js';
import {
  FormIdParamSchema,
  UpsertNotificationPreferenceBodySchema,
} from '../../domain/schemas/request-schemas.js';
import type { Database } from '../../infrastructure/db/client.js';
import { createAuthMiddleware } from '../middleware/auth.middleware.js';
import { successResponse } from '../middleware/error-handler.js';
import type { JwtService } from '../../infrastructure/auth/jwt.js';

export function createNotificationRoutes(jwtService: JwtService, db: Database) {
  const authPlugin = createAuthMiddleware(jwtService);

  return new Elysia()
    .use(authPlugin)
    .decorate('db', db)

  // GET /forms/:formId/notifications/preferences
  .get(
    '/forms/:formId/notifications/preferences',
    async ({ params, db, auth }) => {
      const { formId } = FormIdParamSchema.parse(params);
      const prefs = await getNotificationPreferences(formId, auth.wallet, { db });
      return successResponse(prefs);
    }
  )

  // PUT /forms/:formId/notifications/preferences
  .put(
    '/forms/:formId/notifications/preferences',
    async ({ params, body, db, auth }) => {
      const { formId } = FormIdParamSchema.parse(params);
      const validatedBody = UpsertNotificationPreferenceBodySchema.parse(body);
      
      const prefs = await upsertNotificationPreferences(formId, auth.wallet, validatedBody, { db });
      return successResponse(prefs);
    }
  );
}

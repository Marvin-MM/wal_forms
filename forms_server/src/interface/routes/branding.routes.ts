/**
 * Branding routes
 *
 * GET /forms/:formId/branding     — public, no auth required
 * PUT /forms/:formId/branding     — JWT protected, ownership verified
 */
import Elysia from 'elysia';
import { FormIdParamSchema, UpsertFormBrandingBodySchema } from '../../domain/schemas/request-schemas.js';
import { getFormBranding, upsertFormBranding, type BrandingDeps } from '../../application/branding/index.js';
import { createAuthMiddleware } from '../middleware/auth.middleware.js';
import { successResponse } from '../middleware/error-handler.js';
import type { JwtService } from '../../infrastructure/auth/jwt.js';

export function createBrandingRoutes(jwtService: JwtService, deps: BrandingDeps) {
  const authPlugin = createAuthMiddleware(jwtService);

  return new Elysia()
    // Public — no authentication
    .get('/forms/:formId/branding', async ({ params }) => {
      const { formId } = FormIdParamSchema.parse(params);
      const branding = await getFormBranding(formId, deps.db);
      return successResponse(branding);
    })

    // Protected — JWT + ownership
    .use(authPlugin)
    .put('/forms/:formId/branding', async (ctx) => {
      const { formId } = FormIdParamSchema.parse(ctx.params);
      const data = UpsertFormBrandingBodySchema.parse(ctx.body);
      const result = await upsertFormBranding(formId, ctx.auth.wallet, data, deps);
      return successResponse(result);
    });
}

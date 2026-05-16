/**
 * Admin routes: manage form admin access.
 */
import Elysia from 'elysia';
import { AddAdminSchema, FormIdParamSchema } from '../../domain/schemas/request-schemas.js';
import { addAdmin, removeAdmin, listAdmins, type AdminDeps } from '../../application/admins/index.js';
import { createAuthMiddleware } from '../middleware/auth.middleware.js';
import { successResponse } from '../middleware/error-handler.js';
import type { JwtService } from '../../infrastructure/auth/jwt.js';

export function createAdminsRoutes(jwtService: JwtService, deps: AdminDeps) {
  const authPlugin = createAuthMiddleware(jwtService);

  return new Elysia()
    .use(authPlugin)
    .post('/forms/:formId/admins', async (ctx) => {
      const { formId } = FormIdParamSchema.parse(ctx.params);
      const { walletAddress } = AddAdminSchema.parse(ctx.body);
      const admin = await addAdmin(formId, walletAddress, ctx.auth.wallet, deps);
      return successResponse(admin);
    })
    .delete('/forms/:formId/admins/:wallet', async (ctx) => {
      const { formId } = FormIdParamSchema.parse(ctx.params);
      const wallet = (ctx.params as Record<string, string>)['wallet']!;
      await removeAdmin(formId, wallet, ctx.auth.wallet, deps);
      return successResponse({ message: 'Admin removed' });
    })
    .get('/forms/:formId/admins', async (ctx) => {
      const { formId } = FormIdParamSchema.parse(ctx.params);
      const admins = await listAdmins(formId, ctx.auth.wallet, deps);
      return successResponse(admins);
    });
}

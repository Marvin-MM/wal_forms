/**
 * Access Control routes
 *
 * All routes are JWT protected and require form ownership.
 *
 * GET    /forms/:formId/access-policy            — get policy (no password hash)
 * PUT    /forms/:formId/access-policy            — upsert policy
 * GET    /forms/:formId/allowlist                — paginated list
 * POST   /forms/:formId/allowlist                — add entry
 * DELETE /forms/:formId/allowlist/:walletAddress — remove entry
 */
import Elysia from 'elysia';
import {
  FormIdParamSchema,
  WalletAddressParamSchema,
  FormAccessPolicySchema,
  AddAllowlistEntryBodySchema,
  ListAllowlistQuerySchema,
} from '../../domain/schemas/request-schemas.js';
import {
  upsertAccessPolicy,
  getAccessPolicy,
  getPublicAccessPolicy,
  checkAllowlistAccess,
  addAllowlistEntry,
  removeAllowlistEntry,
  listAllowlist,
  type AccessDeps,
} from '../../application/access/index.js';
import { createAuthMiddleware } from '../middleware/auth.middleware.js';
import { successResponse } from '../middleware/error-handler.js';
import type { JwtService } from '../../infrastructure/auth/jwt.js';

export function createAccessRoutes(jwtService: JwtService, deps: AccessDeps) {
  const authPlugin = createAuthMiddleware(jwtService);

  return new Elysia()
    // Public-safe access policy: enough for public form gating, never secrets.
    .get('/forms/:formId/access-policy', async (ctx) => {
      const { formId } = FormIdParamSchema.parse(ctx.params);
      const policy = await getPublicAccessPolicy(formId, deps.db);
      return successResponse(policy);
    })

    .get('/forms/:formId/access/check', async (ctx) => {
      const { formId } = FormIdParamSchema.parse(ctx.params);
      const wallet = String((ctx.query as { wallet?: string }).wallet ?? '');
      const result = wallet
        ? await checkAllowlistAccess(formId, wallet, deps.db)
        : { allowed: false };
      return successResponse(result);
    })

    .use(authPlugin)

    // Owner access policy read/update
    .get('/forms/:formId/access-policy/owner', async (ctx) => {
      const { formId } = FormIdParamSchema.parse(ctx.params);
      const policy = await getAccessPolicy(formId, ctx.auth.wallet, deps.db);
      return successResponse(policy);
    })

    .put('/forms/:formId/access-policy', async (ctx) => {
      const { formId } = FormIdParamSchema.parse(ctx.params);
      const bodyWithFormId = { ...(ctx.body as object || {}), formId };
      const data = FormAccessPolicySchema.parse(bodyWithFormId);
      await upsertAccessPolicy(formId, ctx.auth.wallet, data, deps);
      
      // Fetch the updated policy to return the full shape to the frontend
      const updatedPolicy = await getAccessPolicy(formId, ctx.auth.wallet, deps.db);
      return successResponse(updatedPolicy);
    })

    // Allowlist
    .get('/forms/:formId/allowlist', async (ctx) => {
      const { formId } = FormIdParamSchema.parse(ctx.params);
      const query = ListAllowlistQuerySchema.parse(ctx.query);
      const result = await listAllowlist(formId, ctx.auth.wallet, query.page, query.pageSize, deps.db);
      return successResponse(result);
    })

    .post('/forms/:formId/allowlist', async (ctx) => {
      const { formId } = FormIdParamSchema.parse(ctx.params);
      const { walletAddress } = AddAllowlistEntryBodySchema.parse(ctx.body);
      const result = await addAllowlistEntry(formId, ctx.auth.wallet, walletAddress, deps);
      return successResponse(result);
    })

    .delete('/forms/:formId/allowlist/:walletAddress', async (ctx) => {
      const { formId, walletAddress } = WalletAddressParamSchema.parse(ctx.params);
      await removeAllowlistEntry(formId, ctx.auth.wallet, walletAddress, deps);
      return successResponse({ removed: walletAddress });
    });
}

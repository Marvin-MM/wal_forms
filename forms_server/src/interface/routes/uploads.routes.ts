/**
 * Upload routes: create session + confirm upload.
 */
import Elysia from 'elysia';
import { CreateUploadSessionSchema, ConfirmUploadSchema } from '../../domain/schemas/request-schemas.js';
import { createUploadSession, confirmUpload, type UploadDeps } from '../../application/uploads/index.js';
import { createAuthMiddleware } from '../middleware/auth.middleware.js';
import { successResponse } from '../middleware/error-handler.js';
import type { JwtService } from '../../infrastructure/auth/jwt.js';

export function createUploadsRoutes(jwtService: JwtService, deps: UploadDeps) {
  const authPlugin = createAuthMiddleware(jwtService);

  return new Elysia({ prefix: '/uploads' })
    .use(authPlugin)
    .post('/session', async (ctx) => {
      const parsed = CreateUploadSessionSchema.parse(ctx.body);
      const session = await createUploadSession(parsed, ctx.auth.wallet, deps);
      return successResponse(session);
    })
    .post('/confirm', async (ctx) => {
      const parsed = ConfirmUploadSchema.parse(ctx.body);
      const result = await confirmUpload(parsed, deps);
      return successResponse(result);
    });
}

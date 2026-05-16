/**
 * Export routes: trigger CSV export, get status.
 */
import Elysia from 'elysia';
import { eq, desc } from 'drizzle-orm';
import { FormIdParamSchema } from '../../domain/schemas/request-schemas.js';
import { createAuthMiddleware } from '../middleware/auth.middleware.js';
import { successResponse } from '../middleware/error-handler.js';
import type { JwtService } from '../../infrastructure/auth/jwt.js';
import type { Database } from '../../infrastructure/db/client.js';
import { exportJobs } from '../../infrastructure/db/schema.js';
import { inngest } from '../../infrastructure/inngest/client.js';
import { NotFoundError } from '../../shared/errors/index.js';

export function createExportRoutes(jwtService: JwtService, db: Database) {
  const authPlugin = createAuthMiddleware(jwtService);

  return new Elysia()
    .use(authPlugin)
    .post('/forms/:formId/export', async (ctx) => {
      const { formId } = FormIdParamSchema.parse(ctx.params);

      const [exportJob] = await db.insert(exportJobs).values({
        formId,
        status: 'pending',
      }).returning();

      await inngest.send({
        name: 'forms/export.requested',
        data: { formId, exportId: exportJob!.id },
      });

      return successResponse({ exportId: exportJob!.id, status: 'pending' });
    })
    .get('/forms/:formId/export', async (ctx) => {
      const { formId } = FormIdParamSchema.parse(ctx.params);

      const [latest] = await db
        .select()
        .from(exportJobs)
        .where(eq(exportJobs.formId, formId))
        .orderBy(desc(exportJobs.createdAt))
        .limit(1);

      if (!latest) throw new NotFoundError('Export job');

      return successResponse(latest);
    });
}

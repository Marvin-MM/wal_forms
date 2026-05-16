/**
 * Analysis routes: trigger AI feedback analysis, get results.
 */
import Elysia from 'elysia';
import { eq, desc } from 'drizzle-orm';
import { FormIdParamSchema } from '../../domain/schemas/request-schemas.js';
import { createAuthMiddleware } from '../middleware/auth.middleware.js';
import { successResponse } from '../middleware/error-handler.js';
import type { JwtService } from '../../infrastructure/auth/jwt.js';
import type { Database } from '../../infrastructure/db/client.js';
import { analyses } from '../../infrastructure/db/schema.js';
import { inngest } from '../../infrastructure/inngest/client.js';
import { NotFoundError } from '../../shared/errors/index.js';

export function createAnalysisRoutes(jwtService: JwtService, db: Database) {
  const authPlugin = createAuthMiddleware(jwtService);

  return new Elysia()
    .use(authPlugin)
    .post('/forms/:formId/analysis', async (ctx) => {
      const { formId } = FormIdParamSchema.parse(ctx.params);

      // Create analysis record
      const [analysis] = await db.insert(analyses).values({
        formId,
        jobStatus: 'pending',
      }).returning();

      // Trigger Inngest job
      await inngest.send({
        name: 'forms/analysis.requested',
        data: { formId, analysisId: analysis!.id },
      });

      return successResponse({ analysisId: analysis!.id, status: 'pending' });
    })
    .get('/forms/:formId/analysis', async (ctx) => {
      const { formId } = FormIdParamSchema.parse(ctx.params);

      const [latest] = await db
        .select()
        .from(analyses)
        .where(eq(analyses.formId, formId))
        .orderBy(desc(analyses.createdAt))
        .limit(1);

      if (!latest) throw new NotFoundError('Analysis');

      return successResponse(latest);
    });
}

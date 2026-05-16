/**
 * Analysis routes: trigger AI feedback analysis, get results.
 */
import Elysia from 'elysia';
import { and, eq, desc } from 'drizzle-orm';
import { FormIdParamSchema } from '../../domain/schemas/request-schemas.js';
import { createAuthMiddleware } from '../middleware/auth.middleware.js';
import { successResponse } from '../middleware/error-handler.js';
import type { JwtService } from '../../infrastructure/auth/jwt.js';
import type { Database } from '../../infrastructure/db/client.js';
import { admins, analyses, forms } from '../../infrastructure/db/schema.js';
import { inngest } from '../../infrastructure/inngest/client.js';
import { AuthorizationError, NotFoundError } from '../../shared/errors/index.js';

export function createAnalysisRoutes(jwtService: JwtService, db: Database) {
  const authPlugin = createAuthMiddleware(jwtService);

  return new Elysia()
    .use(authPlugin)
    .post('/forms/:formId/analysis', async (ctx) => {
      const { formId } = FormIdParamSchema.parse(ctx.params);
      await assertFormAccess(db, formId, ctx.auth.wallet);

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
      await assertFormAccess(db, formId, ctx.auth.wallet);

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

async function assertFormAccess(db: Database, formId: string, wallet: string) {
  const [form] = await db.select().from(forms).where(eq(forms.id, formId));
  if (!form) throw new NotFoundError('Form', formId);
  if (form.ownerWallet === wallet) return;

  const [admin] = await db
    .select({ id: admins.id })
    .from(admins)
    .where(and(eq(admins.formId, formId), eq(admins.walletAddress, wallet)));
  if (!admin) throw new AuthorizationError('You do not have access to this form');
}

/**
 * Current user / platform account API routes.
 *
 * GET    /me                           — submitter profile
 * GET    /me/submissions               — list wallet-connected submission receipts
 * DELETE /me/submissions/:blobId       — request content suppression
 * POST   /me/forms/:formId/export      — trigger CSV export
 * GET    /me/forms/:formId/exports     — list export jobs
 */
import { Elysia, t } from 'elysia';
import { getSubmitterProfile, requestCsvExport, getExportJobs } from '../../application/submitter/index.js';
import { successResponse } from '../middleware/error-handler.js';
import type { Database } from '../../infrastructure/db/client.js';
import { createAuthMiddleware } from '../middleware/auth.middleware.js';
import type { JwtService } from '../../infrastructure/auth/jwt.js';
import { submissions, forms } from '../../infrastructure/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { NotFoundError } from '../../shared/errors/index.js';

export function createMeRoutes(jwtService: JwtService, db: Database) {
  const authPlugin = createAuthMiddleware(jwtService);

  return new Elysia({ prefix: '/me' })
    .decorate('db', db)
    .use(authPlugin)

    // ── Profile ──────────────────────────────────────────────────────────────
    .get('/', async ({ auth, db }) => {
      const profile = await getSubmitterProfile(auth.wallet, { db });
      return successResponse(profile);
    })

    // ── My Submissions ────────────────────────────────────────────────────────
    .get('/submissions', async ({ auth, db }) => {
      const rows = await db
        .select({
          id: submissions.id,
          formId: submissions.formId,
          formTitle: forms.title,
          formDescription: forms.description,
          walrusBlobId: submissions.walrusBlobId,
          suiObjectId: submissions.suiObjectId,
          isEncrypted: submissions.isEncrypted,
          isAnonymous: submissions.isAnonymous,
          isSponsored: submissions.isSponsored,
          schemaVersion: forms.schemaVersion,
          createdAt: submissions.createdAt,
        })
        .from(submissions)
        .innerJoin(forms, eq(submissions.formId, forms.id))
        .where(
          and(
            eq(submissions.submitterWallet, auth.wallet),
            eq(submissions.deletionRequested, false),
          )
        )
        .orderBy(submissions.createdAt);

      return successResponse(rows);
    })

    // ── Request submission suppression ────────────────────────────────────────
    .delete('/submissions/:blobId', async ({ auth, params: { blobId }, db }) => {
      const [sub] = await db
        .select({ id: submissions.id, submitterWallet: submissions.submitterWallet })
        .from(submissions)
        .where(eq(submissions.walrusBlobId, blobId))
        .limit(1);

      if (!sub || sub.submitterWallet !== auth.wallet) {
        throw new NotFoundError('Submission', blobId);
      }

      await db
        .update(submissions)
        .set({ deletionRequested: true, updatedAt: new Date() })
        .where(eq(submissions.walrusBlobId, blobId));

      return successResponse({ suppressed: blobId });
    }, {
      params: t.Object({ blobId: t.String() }),
    })

    // ── Export jobs ───────────────────────────────────────────────────────────
    .post('/forms/:formId/export', async ({ auth, params: { formId }, db }) => {
      const job = await requestCsvExport(formId, auth.wallet, { db });
      return successResponse(job);
    }, {
      params: t.Object({ formId: t.String({ format: 'uuid' }) }),
    })

    .get('/forms/:formId/exports', async ({ auth, params: { formId }, db }) => {
      const jobs = await getExportJobs(formId, auth.wallet, { db });
      return successResponse(jobs);
    }, {
      params: t.Object({ formId: t.String({ format: 'uuid' }) }),
    });
}

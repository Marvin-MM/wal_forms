/**
 * Public submission verification routes.
 */
import { Elysia, t } from 'elysia';
import type { Database } from '../../infrastructure/db/client.js';
import { submissions, forms } from '../../infrastructure/db/schema.js';
import { eq } from 'drizzle-orm';
import { NotFoundError } from '../../shared/errors/index.js';

export function createVerifyRoutes(db: Database) {
  return new Elysia({ prefix: '/verify' })
    // Decorate with dependencies
    .decorate('db', db)

  // GET /verify/:suiObjectId
  .get('/:suiObjectId', async ({ params: { suiObjectId }, db }) => {
    // 1. Fetch submission
    const [sub] = await db
      .select({
        submissionId: submissions.id,
        formId: submissions.formId,
        walrusBlobId: submissions.walrusBlobId,
        suiObjectId: submissions.suiObjectId,
        identityMode: submissions.submissionIdentityMode,
        isAnonymous: submissions.isAnonymous,
        isSponsored: submissions.isSponsored,
        createdAt: submissions.createdAt,
      })
      .from(submissions)
      .where(eq(submissions.suiObjectId, suiObjectId));

    if (!sub) throw new NotFoundError('Submission', suiObjectId);

    // 2. Fetch form metadata
    const [form] = await db
      .select({
        title: forms.title,
        ownerWallet: forms.ownerWallet,
      })
      .from(forms)
      .where(eq(forms.id, sub.formId));

    return {
      success: true,
      data: {
        submission: sub,
        form,
      },
    };
  }, {
    params: t.Object({
      suiObjectId: t.String(),
    }),
  });
}

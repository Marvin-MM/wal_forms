/**
 * Submission routes — updated for Phase A three-flow architecture.
 *
 * POST /forms/:formId/submissions
 *   Routes to submitAnonymousResponse, submitSponsoredResponsePhase1,
 *   submitSponsoredResponsePhase2, or submitSelfPaidResponse based on
 *   the discriminated `identity_mode` field in the request body.
 *
 * Admin read/update routes are unchanged.
 */
import Elysia from 'elysia';
import {
  CreateSubmissionSchema,
  UpdateSubmissionSchema,
  ListSubmissionsQuerySchema,
  FormIdParamSchema,
  SubmissionIdParamSchema,
} from '../../domain/schemas/request-schemas.js';
import {
  submitAnonymousResponse,
  submitSponsoredResponsePhase1,
  submitSponsoredResponsePhase2,
  submitSelfPaidResponse,
  submitConnectedOffchainResponse,
  listSubmissions,
  getSubmission,
  updateSubmission,
  type SubmissionDeps,
} from '../../application/submissions/index.js';
import { createAuthMiddleware } from '../middleware/auth.middleware.js';
import { successResponse } from '../middleware/error-handler.js';
import type { JwtService } from '../../infrastructure/auth/jwt.js';
import { createRateLimiter } from '../middleware/rate-limiter.js';
import type { Server } from 'bun';

export function createSubmissionsRoutes(
  jwtService: JwtService,
  deps: SubmissionDeps,
  rateLimitMax: number,
  getServer: () => Server<unknown> | null
) {
  const authPlugin = createAuthMiddleware(jwtService);

  return new Elysia()
    .use(createRateLimiter(getServer, { max: rateLimitMax }))

    /**
     * POST /forms/:formId/submissions
     *
     * Dispatches to one of four submission flows based on `identity_mode`:
     *   - 'anonymous'          → server executes full PTB (no client wallet)
     *   - 'sponsored'          → phase 1: server co-signs gas, returns session
     *   - 'sponsored_complete' → phase 2: client signed; server broadcasts
     *   - 'self_paid'          → client already broadcast; server indexes digest
     *
     * Returns:
     *   phase 1: { phase: 'sponsored', sessionToken, sponsoredTxBytesB64, expiresAt }
     *   complete: { phase: 'complete', submissionId, digest }
     */
    .post('/forms/:formId/submissions', async ({ params, body, request }) => {
      const { formId } = FormIdParamSchema.parse(params);
      const parsed = CreateSubmissionSchema.parse(body);
      const remoteIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();

      switch (parsed.identity_mode) {
        case 'anonymous':
          return successResponse(
            await submitAnonymousResponse(formId, parsed, deps, remoteIp)
          );

        case 'sponsored':
          return successResponse(
            await submitSponsoredResponsePhase1(formId, parsed, deps, remoteIp)
          );

        case 'sponsored_complete':
          return successResponse(
            await submitSponsoredResponsePhase2(formId, parsed, deps)
          );

        case 'self_paid':
          return successResponse(
            await submitSelfPaidResponse(formId, parsed, deps, remoteIp)
          );

        case 'connected_offchain':
          return successResponse(
            await submitConnectedOffchainResponse(formId, parsed, deps, remoteIp)
          );
      }
    })

    // Admin routes (JWT protected)
    .use(authPlugin)
    .get('/forms/:formId/submissions', async (ctx) => {
      const { formId } = FormIdParamSchema.parse(ctx.params);
      const query = ListSubmissionsQuerySchema.parse(ctx.query);
      const result = await listSubmissions(formId, ctx.auth.wallet, query, deps);
      return successResponse(result);
    })
    .get('/forms/:formId/submissions/:submissionId', async (ctx) => {
      const { formId, submissionId } = SubmissionIdParamSchema.parse(ctx.params);
      const result = await getSubmission(formId, submissionId, ctx.auth.wallet, deps);
      return successResponse(result);
    })
    .patch('/forms/:formId/submissions/:submissionId', async (ctx) => {
      const { formId, submissionId } = SubmissionIdParamSchema.parse(ctx.params);
      const parsed = UpdateSubmissionSchema.parse(ctx.body);
      const result = await updateSubmission(formId, submissionId, parsed, ctx.auth.wallet, deps);
      return successResponse(result);
    });
}

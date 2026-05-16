/**
 * AI routes: generate form schema from description.
 */
import Elysia from 'elysia';
import { GenerateSchemaSchema } from '../../domain/schemas/request-schemas.js';
import { generateSchema } from '../../application/ai/index.js';
import { createAuthMiddleware } from '../middleware/auth.middleware.js';
import { successResponse } from '../middleware/error-handler.js';
import type { JwtService } from '../../infrastructure/auth/jwt.js';
import type { AIClient } from '../../infrastructure/ai/client.js';
import { createRateLimiter } from '../middleware/rate-limiter.js';
import type { Server } from 'bun';

export function createAIRoutes(jwtService: JwtService, aiClient: AIClient, rateLimitMax: number, getServer: () => Server<unknown> | null) {
  const authPlugin = createAuthMiddleware(jwtService);

  return new Elysia({ prefix: '/ai' })
    .use(createRateLimiter(getServer, { max: rateLimitMax }))
    .use(authPlugin)
    .post('/generate-schema', async (ctx) => {
      const { description } = GenerateSchemaSchema.parse(ctx.body);
      const schema = await generateSchema(description, aiClient);
      return successResponse(schema);
    });
}

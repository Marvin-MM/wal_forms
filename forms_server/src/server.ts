/**
 * Elysia app factory — assembles all plugins, middleware, and route groups.
 */
import Elysia from 'elysia';
import cors from '@elysiajs/cors';
import type { Env } from './shared/config/env.js';
import type { Database } from './infrastructure/db/client.js';
import type { WalrusClient } from './infrastructure/walrus/client.js';
import type { SuiBlockchainClient } from './infrastructure/sui/client.js';
import type { SealClient } from './infrastructure/seal/client.js';
import type { AIClient } from './infrastructure/ai/client.js';
import type { JwtService } from './infrastructure/auth/jwt.js';

// Middleware
import { requestLogger } from './interface/middleware/request-logger.js';
import { errorHandler } from './interface/middleware/error-handler.js';

// Routes
import { createAuthRoutes } from './interface/routes/auth.routes.js';
import { createFormsRoutes } from './interface/routes/forms.routes.js';
import { createSubmissionsRoutes } from './interface/routes/submissions.routes.js';
import { createAdminsRoutes } from './interface/routes/admins.routes.js';
import { createAnalysisRoutes } from './interface/routes/analysis.routes.js';
import { createExportRoutes } from './interface/routes/export.routes.js';
import { createUploadsRoutes } from './interface/routes/uploads.routes.js';
import { createAIRoutes } from './interface/routes/ai.routes.js';
import { createHealthRoutes } from './interface/routes/health.routes.js';
import { createSealRoutes } from './interface/routes/seal.routes.js';
import { createBrandingRoutes } from './interface/routes/branding.routes.js';
import { createAccessRoutes } from './interface/routes/access.routes.js';
import { createNotificationRoutes } from './interface/routes/notifications.routes.js';
import { createAnalyticsRoutes } from './interface/routes/analytics.routes.js';
import { createMeRoutes } from './interface/routes/me.routes.js';
import { createVerifyRoutes } from './interface/routes/verify.routes.js';
import { createDashboardWs } from './interface/ws/dashboard.js';

// Inngest
import { inngestHandler } from './infrastructure/inngest/serve.js';
import type { Server } from 'bun';

export interface ServerDeps {
  env: Env;
  db: Database;
  walrus: WalrusClient;
  sui: SuiBlockchainClient;
  seal: SealClient;
  ai: AIClient;
  jwt: JwtService;
}

export function createServer(deps: ServerDeps) {
  const { env, db, walrus, sui, seal, ai, jwt } = deps;

  // Lazy server getter — resolved after app.listen() is called.
  // Passed into rate-limited routes so elysia-rate-limit can read the real client IP.
  let _server: Server<unknown> | null = null;
  const getServer = () => _server;

  const app = new Elysia()
    // Phase C subdomains
    .use(createMeRoutes(jwt, db))
    .use(createVerifyRoutes(db))
    // Global middleware
    .use(errorHandler)
    .use(requestLogger)
    .use(cors({
      origin: env.CORS_ALLOWED_ORIGINS.split(',').map((o: string) => o.trim()),
      credentials: true,
    }))
    // Security headers
    .onAfterHandle(({ set }) => {
      set.headers['x-content-type-options'] = 'nosniff';
      set.headers['x-frame-options'] = 'DENY';
      set.headers['x-xss-protection'] = '1; mode=block';
      set.headers['strict-transport-security'] = 'max-age=31536000; includeSubDomains';
      set.headers['referrer-policy'] = 'strict-origin-when-cross-origin';
    })
    // Internal webhooks/tooling
    .all('/api/inngest', async ({ request }) => {
      return inngestHandler(request);
    })
    // Route groups
    .use(createAuthRoutes(jwt))
    .use(createFormsRoutes(jwt, { db, walrus, sui }))
    .use(createSubmissionsRoutes(jwt, { db, walrus, sui, turnstileSecret: env.CLOUDFLARE_TURNSTILE_SECRET_KEY }, env.RATE_LIMIT_SUBMISSION, getServer))
    .use(createAdminsRoutes(jwt, { db, seal }))
    .use(createAnalysisRoutes(jwt, db))
    .use(createExportRoutes(jwt, db))
    .use(createUploadsRoutes(jwt, { db, walrus }))
    .use(createAIRoutes(jwt, ai, env.RATE_LIMIT_AI, getServer))
    .use(createHealthRoutes(db, walrus))
    .use(createSealRoutes(seal))
    .use(createBrandingRoutes(jwt, { db, walrus, sui }))
    .use(createAccessRoutes(jwt, { db, sui }))
    .use(createNotificationRoutes(jwt, db))
    .use(createAnalyticsRoutes(jwt, db))
    .use(createDashboardWs(jwt));

  return {
    app,
    /** Call after app.listen() to inject the Bun server into rate limiters. */
    setServer(server: Server<unknown>) {
      _server = server;
    },
  };
}

/**
 * Rate limiter factory.
 *
 * elysia-rate-limit needs access to the Bun server to determine the real
 * client IP address. We pass a lazy getter so it's resolved after app.listen().
 *
 * Usage:
 *   const limiter = createRateLimiter(() => app.server, { max: 10, duration: 60_000 });
 *   new Elysia().use(limiter)
 */
import { rateLimit } from 'elysia-rate-limit';
import type { Server } from 'bun';

interface RateLimiterOptions {
  max: number;
  /** Window duration in milliseconds. Default: 60_000 (1 minute) */
  duration?: number;
  /** Additional paths that should never be counted by this limiter. */
  skipPaths?: string[];
}

export function createRateLimiter(
  getServer: () => Server<unknown> | null,
  options: RateLimiterOptions
) {
  return rateLimit({
    max: options.max,
    duration: options.duration ?? 60_000,
    scoping: 'scoped',
    injectServer: getServer,
    skip: (request) => {
      const pathname = new URL(request.url).pathname;
      return pathname === '/api/inngest' || (options.skipPaths?.includes(pathname) ?? false);
    },
    // Return a structured JSON error instead of a plain string
    errorResponse: new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests — please slow down and try again.',
        },
      }),
      {
        status: 429,
        headers: { 'content-type': 'application/json' },
      }
    ),
  });
}

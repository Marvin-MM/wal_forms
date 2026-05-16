/**
 * JWT authentication middleware for Elysia.
 *
 * Uses .resolve() + explicit error responses instead of throwing inside .derive().
 * Elysia's .derive() does not route exceptions through the .onError() handler,
 * so we handle auth failure by setting the response directly.
 */
import Elysia from 'elysia';
import type { JwtService } from '../../infrastructure/auth/jwt.js';

export function createAuthMiddleware(jwtService: JwtService) {
  return new Elysia({ name: 'auth-middleware' })
    .derive({ as: 'scoped' }, async ({ headers, set }) => {
      const authHeader = headers['authorization'];

      if (!authHeader?.startsWith('Bearer ')) {
        set.status = 401;
        return {
          auth: null as unknown as { wallet: string; sub: string },
          _authError: 'Missing or invalid Authorization header',
        };
      }

      try {
        const token = authHeader.slice(7);
        const payload = await jwtService.verify(token);
        return { auth: payload, _authError: null };
      } catch {
        set.status = 401;
        return {
          auth: null as unknown as { wallet: string; sub: string },
          _authError: 'Invalid or expired token',
        };
      }
    })
    // Guard every downstream route: if auth failed, return early with error JSON.
    .onBeforeHandle({ as: 'scoped' }, ({ _authError, set }) => {
      if (_authError) {
        set.status = 401;
        return {
          success: false,
          error: { code: 'AUTHENTICATION_ERROR', message: _authError },
        };
      }
    });
}

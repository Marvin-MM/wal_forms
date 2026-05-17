/**
 * Auth routes: nonce, verify, refresh, logout.
 */
import Elysia from 'elysia';
import { RequestNonceSchema, VerifySiWSSchema } from '../../domain/schemas/request-schemas.js';
import { requestNonce, verifySiWS, refreshToken } from '../../application/auth/index.js';
import type { JwtService } from '../../infrastructure/auth/jwt.js';
import { successResponse } from '../middleware/error-handler.js';
import { AuthenticationError } from '../../shared/errors/index.js';

import type { SuiBlockchainClient } from '../../infrastructure/sui/client.js';

export function createAuthRoutes(jwtService: JwtService, sui: SuiBlockchainClient) {
  return new Elysia({ prefix: '/auth' })
    .post('/nonce', async ({ body }) => {
      const parsed = RequestNonceSchema.parse(body);
      const result = await requestNonce(parsed.walletAddress);
      return successResponse(result);
    })
    .post('/verify', async ({ body, cookie }) => {
      const parsed = VerifySiWSSchema.parse(body);
      const result = await verifySiWS(parsed, jwtService, sui.getSuiClient());

      // Set refresh token as httpOnly cookie
      cookie['refresh_token']?.set({
        value: result.refreshToken,
        httpOnly: true,
        secure: process.env['NODE_ENV'] === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/',
      });

      return successResponse({ accessToken: result.accessToken });
    })
    .post('/refresh', async ({ cookie }) => {
      const refreshCookie = cookie['refresh_token']?.value;
      if (!refreshCookie || typeof refreshCookie !== 'string') {
        throw new AuthenticationError('No refresh token');
      }

      const result = await refreshToken(refreshCookie, jwtService);

      cookie['refresh_token']?.set({
        value: result.refreshToken,
        httpOnly: true,
        secure: process.env['NODE_ENV'] === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      });

      return successResponse({ accessToken: result.accessToken });
    })
    .post('/logout', ({ cookie }) => {
      cookie['refresh_token']?.remove();
      return successResponse({ message: 'Logged out' });
    });
}

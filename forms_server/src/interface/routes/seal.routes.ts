/**
 * Seal config route — returns key server Object IDs and policy package to the frontend.
 * The browser's @mysten/seal SDK uses this to perform client-side encryption.
 * This endpoint is intentionally public — these values are not secrets.
 */
import Elysia from 'elysia';
import { successResponse } from '../middleware/error-handler.js';
import type { SealClient } from '../../infrastructure/seal/client.js';

export function createSealRoutes(seal: SealClient) {
  return new Elysia({ prefix: '/seal' })
    .get('/config', () => {
      return successResponse({
        ...seal.getEncryptionConfig(),
        enabled: seal.isConfigured(),
      });
    });
}

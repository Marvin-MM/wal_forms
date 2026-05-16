/**
 * Health check route.
 */
import Elysia from 'elysia';
import { successResponse } from '../middleware/error-handler.js';
import type { Database } from '../../infrastructure/db/client.js';
import type { WalrusClient } from '../../infrastructure/walrus/client.js';
import { sql } from 'drizzle-orm';

export function createHealthRoutes(db: Database, walrus: WalrusClient) {
  return new Elysia({ prefix: '/health' })
    .get('/', async () => {
      let dbStatus = false;
      let walrusStatus = false;

      try {
        await db.execute(sql`SELECT 1`);
        dbStatus = true;
      } catch { /* empty */ }

      try {
        walrusStatus = await walrus.isAggregatorReachable();
      } catch { /* empty */ }

      const healthy = dbStatus; // DB is critical, Walrus is degraded

      return successResponse({
        status: healthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        services: {
          database: dbStatus ? 'connected' : 'disconnected',
          walrus: walrusStatus ? 'reachable' : 'unreachable',
        },
      });
    });
}

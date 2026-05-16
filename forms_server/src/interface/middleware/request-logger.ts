/**
 * Request logger middleware — structured JSON logging.
 */
import Elysia from 'elysia';
import { logger } from '../../shared/logger.js';

export const requestLogger = new Elysia({ name: 'request-logger' })
  .onBeforeHandle({ as: 'global' }, ({ store }) => {
    (store as Record<string, unknown>)['startTime'] = Date.now();
  })
  .onAfterHandle({ as: 'global' }, ({ request, store, set, response }) => {
    const start = (store as Record<string, unknown>)['startTime'] as number;
    const duration = Date.now() - start;
    const url = new URL(request.url);
    const status = getResponseStatus(response, (set as { status?: number | string }).status);

    // Inngest dev server syncs by polling this endpoint with frequent PUTs,
    // and invokes functions with POSTs. Successful requests are expected noise.
    if (url.pathname === '/api/inngest' && status < 400) return;

    logger.info({
      method: request.method,
      path: url.pathname,
      status,
      duration,
    }, 'Request completed');
  });

function getResponseStatus(response: unknown, setStatus: number | string | undefined): number {
  if (response instanceof Response) return response.status;
  return typeof setStatus === 'number' ? setStatus : 200;
}

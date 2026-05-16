/**
 * WebSocket dashboard handler.
 * Authenticates via JWT on first message, subscribes to form rooms.
 */
import Elysia from 'elysia';
import type { JwtService } from '../../infrastructure/auth/jwt.js';
import { roomManager } from './room-manager.js';
import { logger } from '../../shared/logger.js';

let connectionCounter = 0;

export function createDashboardWs(jwtService: JwtService) {
  return new Elysia()
    .ws('/ws/dashboard/:formId', {
      open(ws) {
        const connId = `ws_${++connectionCounter}`;
        (ws.data as Record<string, unknown>)['connId'] = connId;
        (ws.data as Record<string, unknown>)['authenticated'] = false;
        logger.debug({ connId }, '[WS] Connection opened, awaiting auth');
      },
      async message(ws, message) {
        const data = ws.data as Record<string, unknown>;
        const connId = data['connId'] as string;

        // First message must be JWT authentication
        if (!data['authenticated']) {
          try {
            const msg = typeof message === 'string' ? JSON.parse(message) : message;
            const token = (msg as Record<string, unknown>)['token'] as string;

            if (!token) {
              ws.send(JSON.stringify({ error: 'Token required as first message' }));
              ws.close();
              return;
            }

            const payload = await jwtService.verify(token);
            data['authenticated'] = true;
            data['wallet'] = payload.wallet;

            const wsData = ws.data as unknown as Record<string, unknown>;
            const params = wsData['params'] as Record<string, string> | undefined;
            const targetFormId = params?.['formId'] ?? '';

            roomManager.subscribe(String(targetFormId), { send: (d) => ws.send(d), id: connId });

            ws.send(JSON.stringify({ type: 'authenticated', wallet: payload.wallet }));
            logger.info({ connId, wallet: payload.wallet }, '[WS] Authenticated');
          } catch (error) {
            const msg = error instanceof Error ? error.message : 'Auth failed';
            ws.send(JSON.stringify({ error: msg }));
            ws.close();
          }
          return;
        }

        // After auth, handle ping/pong
        if (typeof message === 'string' && message === 'ping') {
          ws.send('pong');
        }
      },
      close(ws) {
        const data = ws.data as Record<string, unknown>;
        const connId = data['connId'] as string;
        roomManager.unsubscribe({ send: () => {}, id: connId });
        logger.debug({ connId }, '[WS] Connection closed');
      },
    });
}

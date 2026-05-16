/**
 * WebSocket room manager for real-time dashboard updates.
 * Manages subscriptions by formId and handles cleanup on disconnect.
 */
import type { WsEvent } from '../../shared/types/index.js';
import { logger } from '../../shared/logger.js';

// Generic WebSocket type to avoid coupling to Elysia internals
interface WsConnection {
  send(data: string): void;
  id: string;
}

class RoomManager {
  // formId -> Set of connections
  private rooms = new Map<string, Set<WsConnection>>();
  // connectionId -> formId (for cleanup on disconnect)
  private connectionRooms = new Map<string, string>();

  subscribe(formId: string, ws: WsConnection): void {
    if (!this.rooms.has(formId)) {
      this.rooms.set(formId, new Set());
    }
    this.rooms.get(formId)!.add(ws);
    this.connectionRooms.set(ws.id, formId);
    logger.debug({ formId, connectionId: ws.id, roomSize: this.rooms.get(formId)!.size }, '[WS] Subscribed to room');
  }

  unsubscribe(ws: WsConnection): void {
    const formId = this.connectionRooms.get(ws.id);
    if (formId) {
      const room = this.rooms.get(formId);
      if (room) {
        room.delete(ws);
        if (room.size === 0) {
          this.rooms.delete(formId);
        }
      }
      this.connectionRooms.delete(ws.id);
      logger.debug({ formId, connectionId: ws.id }, '[WS] Unsubscribed from room');
    }
  }

  broadcast(formId: string, event: WsEvent): void {
    const room = this.rooms.get(formId);
    if (!room || room.size === 0) return;

    const message = JSON.stringify(event);
    let sent = 0;

    for (const ws of room) {
      try {
        ws.send(message);
        sent++;
      } catch (error) {
        logger.warn({ formId, connectionId: ws.id, error }, '[WS] Failed to send, removing connection');
        room.delete(ws);
        this.connectionRooms.delete(ws.id);
      }
    }

    if (room.size === 0) {
      this.rooms.delete(formId);
    }

    logger.debug({ formId, sent, event: event.type }, '[WS] Broadcast completed');
  }

  getRoomSize(formId: string): number {
    return this.rooms.get(formId)?.size ?? 0;
  }

  getTotalConnections(): number {
    return this.connectionRooms.size;
  }
}

// Singleton instance
export const roomManager = new RoomManager();

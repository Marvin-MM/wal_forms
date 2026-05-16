"use client";
/**
 * WebSocket hook with JWT auth handshake, auto-reconnect, exponential backoff, and typed events.
 */
import { useEffect, useRef, useCallback, useState } from "react";
import { env } from "../lib/env";
import { useAuthStore } from "../store/auth";
import { WsEventType, type WsEvent } from "../shared/types/api";

export type WsStatus = "connecting" | "connected" | "authenticated" | "disconnected" | "error";

interface UseWebSocketOptions {
  onEvent?: (event: WsEvent) => void;
  onStatusChange?: (status: WsStatus) => void;
  enabled?: boolean;
}

const MAX_RECONNECT_ATTEMPTS = 8;
const BASE_DELAY = 1000;

function getBackoffDelay(attempt: number): number {
  return Math.min(BASE_DELAY * Math.pow(2, attempt), 30000);
}

export function useWebSocket(formId: string, options: UseWebSocketOptions = {}) {
  const { onEvent, onStatusChange, enabled = true } = options;
  const { accessToken } = useAuthStore();
  const wsRef = useRef<WebSocket | null>(null);
  const attemptRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const [status, setStatus] = useState<WsStatus>("disconnected");

  const updateStatus = useCallback(
    (s: WsStatus) => {
      setStatus(s);
      onStatusChange?.(s);
    },
    [onStatusChange]
  );

  const connect = useCallback(() => {
    if (!enabled || !formId || !accessToken) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const isServer = typeof window === "undefined";
    const wsProtocol = isServer ? "ws:" : (window.location.protocol === "https:" ? "wss:" : "ws:");
    const base = isServer ? env.NEXT_PUBLIC_WS_BASE_URL : `${wsProtocol}//${window.location.host}`;
    const url = `${base}/ws/dashboard/${formId}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;
    updateStatus("connecting");

    ws.onopen = () => {
      if (!mountedRef.current) return;
      updateStatus("connected");
      // Send JWT as first message (server protocol)
      ws.send(JSON.stringify({ token: accessToken }));
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const raw = JSON.parse(event.data as string) as Record<string, unknown>;

        // Auth acknowledgement
        if (raw["type"] === "authenticated") {
          updateStatus("authenticated");
          attemptRef.current = 0;
          // Start keepalive pings
          pingRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) ws.send("ping");
          }, 25000);
          return;
        }

        // Ignore pong frames
        if (event.data === "pong") return;

        // Typed event
        const wsEvent: WsEvent = {
          type: raw["type"] as WsEventType,
          formId: raw["formId"] as string,
          payload: raw["payload"],
          timestamp: raw["timestamp"] as string ?? new Date().toISOString(),
        };
        onEvent?.(wsEvent);
      } catch {
        // ignore malformed messages
      }
    };

    ws.onerror = () => {
      if (!mountedRef.current) return;
      updateStatus("error");
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      updateStatus("disconnected");
      if (pingRef.current) clearInterval(pingRef.current);

      // Reconnect with exponential backoff
      if (attemptRef.current < MAX_RECONNECT_ATTEMPTS) {
        const delay = getBackoffDelay(attemptRef.current);
        attemptRef.current += 1;
        timerRef.current = setTimeout(connect, delay);
      }
    };
  }, [enabled, formId, accessToken, onEvent, updateStatus]);

  const disconnect = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (pingRef.current) clearInterval(pingRef.current);
    wsRef.current?.close();
    wsRef.current = null;
    updateStatus("disconnected");
  }, [updateStatus]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [connect, disconnect]);

  return { status, disconnect, reconnect: connect };
}

// Re-export event type for consumers
export { WsEventType };

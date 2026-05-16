/**
 * API response envelope and pagination types — mirrors backend shared/types/index.ts.
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ── WebSocket ──────────────────────────────────────────────────────────────────

export enum WsEventType {
  NEW_SUBMISSION = "new_submission",
  SUBMISSION_UPDATED = "submission_updated",
  ANALYSIS_COMPLETE = "analysis_complete",
  EXPORT_COMPLETE = "export_complete",
}

export interface WsEvent {
  type: WsEventType;
  formId: string;
  payload: unknown;
  timestamp: string;
}

// ── API Typed Error ────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ── Health ─────────────────────────────────────────────────────────────────────

export interface HealthResponse {
  status: "healthy" | "degraded";
  timestamp: string;
  services: {
    database: "connected" | "disconnected";
    walrus: "reachable" | "unreachable";
  };
}

// ── Seal Config ────────────────────────────────────────────────────────────────

export interface SealConfig {
  keyServerObjectIds: string[];
  packageId: string;
  enabled: boolean;
}

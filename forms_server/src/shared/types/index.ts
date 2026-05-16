/**
 * Shared type definitions used across all layers.
 */

// Standard API response envelope
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// Paginated response
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Submission priority
export enum SubmissionPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

// Background job status
export enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// WebSocket event types
export enum WsEventType {
  NEW_SUBMISSION = 'new_submission',
  SUBMISSION_UPDATED = 'submission_updated',
  ANALYSIS_COMPLETE = 'analysis_complete',
  EXPORT_COMPLETE = 'export_complete',
}

export interface WsEvent {
  type: WsEventType;
  formId: string;
  payload: unknown;
  timestamp: string;
}

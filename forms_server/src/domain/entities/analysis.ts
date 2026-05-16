/**
 * Analysis entity — stores AI feedback analysis results.
 */
import type { JobStatus } from '../../shared/types/index.js';

export interface Analysis {
  id: string;
  formId: string;
  result: Record<string, unknown> | null;
  jobStatus: JobStatus;
  jobId: string | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ExportJob entity — tracks CSV export background jobs.
 */
import type { JobStatus } from '../../shared/types/index.js';

export interface ExportJob {
  id: string;
  formId: string;
  status: JobStatus;
  resultBlobId: string | null;
  jobId: string | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}

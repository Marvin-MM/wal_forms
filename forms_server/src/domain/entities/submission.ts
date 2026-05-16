/**
 * Submission entity — stores the index record.
 * Content lives on Walrus, not in the database.
 */
import type { SubmissionPriority } from '../../shared/types/index.js';

export interface Submission {
  id: string;
  formId: string;
  walrusBlobId: string;
  suiObjectId: string | null;
  isEncrypted: boolean;
  submitterWallet: string | null;
  adminNotes: string | null;
  priority: SubmissionPriority;
  isReviewed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

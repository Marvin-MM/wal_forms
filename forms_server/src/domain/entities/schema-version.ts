/**
 * SchemaVersion entity — tracks every schema revision.
 * Enables full history replay and submission integrity auditing.
 */
export interface SchemaVersion {
  id: string;
  formId: string;
  blobId: string;
  versionNumber: number;
  parentBlobId: string | null;
  suiObjectId: string | null;
  createdAt: Date;
}

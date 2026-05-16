/**
 * UploadSession entity — tracks authorized upload sessions.
 */
export type UploadPurpose = 'submission' | 'branding_logo' | 'branding_background' | 'branding_favicon';

export interface UploadSession {
  id: string;
  sessionToken: string;
  formId: string;
  allowedMimeTypes: string[];
  maxFileSize: number;
  uploadPurpose: UploadPurpose;
  expiresAt: Date;
  isConsumed: boolean;
  resultBlobId: string | null;
  createdAt: Date;
}

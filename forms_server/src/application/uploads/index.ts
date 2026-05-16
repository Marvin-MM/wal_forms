/**
 * Upload session use cases: create and confirm.
 */
import { eq } from 'drizzle-orm';
import type { Database } from '../../infrastructure/db/client.js';
import type { WalrusClient } from '../../infrastructure/walrus/client.js';
import { uploadSessions, forms } from '../../infrastructure/db/schema.js';
import { NotFoundError, ValidationError, AuthorizationError } from '../../shared/errors/index.js';
import { logger } from '../../shared/logger.js';
import {
  BRANDING_LOGO_MAX_SIZE_BYTES,
  BRANDING_LOGO_MIME_TYPES,
} from '../../domain/entities/form-branding.js';
import type { UploadPurpose } from '../../domain/entities/upload-session.js';

export interface UploadDeps {
  db: Database;
  walrus: WalrusClient;
}

const brandingLogoMimeTypes = new Set<string>(BRANDING_LOGO_MIME_TYPES);

export async function createUploadSession(
  params: { formId: string; allowedMimeTypes: string[]; maxFileSize: number; uploadPurpose?: UploadPurpose },
  wallet: string,
  deps: UploadDeps
) {
  // Verify form exists
  const [form] = await deps.db.select().from(forms).where(eq(forms.id, params.formId));
  if (!form) throw new NotFoundError('Form', params.formId);

  const uploadPurpose = params.uploadPurpose ?? 'submission';
  let allowedMimeTypes = params.allowedMimeTypes;
  let maxFileSize = params.maxFileSize;

  if (uploadPurpose === 'branding_logo') {
    if (form.ownerWallet !== wallet) {
      throw new AuthorizationError('Only the form owner can upload branding assets');
    }

    if (params.maxFileSize > BRANDING_LOGO_MAX_SIZE_BYTES) {
      throw new ValidationError(`Branding logos must be ${BRANDING_LOGO_MAX_SIZE_BYTES} bytes or smaller`);
    }

    const requestedTypes = params.allowedMimeTypes.length > 0
      ? params.allowedMimeTypes
      : [...BRANDING_LOGO_MIME_TYPES];
    const invalidType = requestedTypes.find((type) => !brandingLogoMimeTypes.has(type));
    if (invalidType) {
      throw new ValidationError(`Unsupported branding logo MIME type: ${invalidType}`);
    }

    allowedMimeTypes = requestedTypes;
    maxFileSize = Math.min(params.maxFileSize, BRANDING_LOGO_MAX_SIZE_BYTES);
  }

  const sessionToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

  const [session] = await deps.db.insert(uploadSessions).values({
    sessionToken,
    formId: params.formId,
    allowedMimeTypes,
    maxFileSize,
    uploadPurpose,
    expiresAt,
  }).returning();

  logger.info({ sessionToken, formId: params.formId }, '[Uploads] Session created');
  return session;
}

export async function confirmUpload(
  params: { sessionToken: string; blobId: string },
  deps: UploadDeps
) {
  // Find and validate session
  const [session] = await deps.db
    .select()
    .from(uploadSessions)
    .where(eq(uploadSessions.sessionToken, params.sessionToken));

  if (!session) throw new NotFoundError('Upload session');
  if (session.isConsumed) throw new ValidationError('Upload session already consumed');
  if (session.expiresAt <= new Date()) throw new ValidationError('Upload session expired');

  // Verify blob exists on Walrus
  const metadata = await deps.walrus.verifyBlob(params.blobId);
  if (!metadata.exists) {
    throw new ValidationError('Blob not found on Walrus');
  }

  // Check file size constraint
  if (metadata.size > session.maxFileSize) {
    throw new ValidationError(`File size ${metadata.size} exceeds maximum ${session.maxFileSize}`);
  }

  const allowedMimeTypes = session.allowedMimeTypes ?? [];
  if (!allowedMimeTypes.includes('*/*') && metadata.contentType && metadata.contentType !== 'application/octet-stream') {
    const contentType = metadata.contentType.split(';')[0]?.trim().toLowerCase();
    const normalizedAllowed = allowedMimeTypes.map((type) => type.toLowerCase());
    if (contentType && !normalizedAllowed.includes(contentType)) {
      throw new ValidationError(`Uploaded content type ${metadata.contentType} is not allowed for this session`);
    }
  }

  // Mark session as consumed
  await deps.db
    .update(uploadSessions)
    .set({ isConsumed: true, resultBlobId: params.blobId })
    .where(eq(uploadSessions.id, session.id));

  logger.info({ sessionToken: params.sessionToken, blobId: params.blobId }, '[Uploads] Upload confirmed');
  return { blobId: params.blobId, formId: session.formId, confirmed: true };
}

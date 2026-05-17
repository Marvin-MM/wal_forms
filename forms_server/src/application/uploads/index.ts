/**
 * Upload session use cases: create and confirm.
 */
import { eq } from 'drizzle-orm';
import type { Database } from '../../infrastructure/db/client.js';
import type { WalrusClient } from '../../infrastructure/walrus/client.js';
import { uploadSessions, forms } from '../../infrastructure/db/schema.js';
import { NotFoundError, ValidationError } from '../../shared/errors/index.js';
import { logger } from '../../shared/logger.js';
import { verifyOwnerOrAdmin } from '../forms/index.js';
import {
  BRANDING_LOGO_MAX_SIZE_BYTES,
  BRANDING_LOGO_MIME_TYPES,
} from '../../domain/entities/form-branding.js';
import { FormSchemaDefinition } from '../../domain/schemas/form-schema.js';
import type { UploadPurpose } from '../../domain/entities/upload-session.js';

export interface UploadDeps {
  db: Database;
  walrus: WalrusClient;
}

const brandingLogoMimeTypes = new Set<string>(BRANDING_LOGO_MIME_TYPES);
const DEFAULT_SUBMISSION_FILE_MAX_BYTES = 10 * 1024 * 1024;
const ABSOLUTE_SUBMISSION_FILE_MAX_BYTES = 100 * 1024 * 1024;

function mimeMatches(allowed: string[], mimeType: string): boolean {
  if (allowed.includes('*/*')) return true;
  const normalized = mimeType.toLowerCase();
  return allowed.some((entry) => {
    const allowedType = entry.toLowerCase();
    if (allowedType.endsWith('/*')) {
      return normalized.startsWith(`${allowedType.slice(0, -1)}`);
    }
    return normalized === allowedType;
  });
}

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
    await verifyOwnerOrAdmin(form, wallet, deps.db);

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

export async function createSubmissionUploadSession(
  params: { formId: string; fieldId: string; mimeType: string; fileSize: number },
  deps: UploadDeps
) {
  const [form] = await deps.db.select().from(forms).where(eq(forms.id, params.formId));
  if (!form) throw new NotFoundError('Form', params.formId);

  const parsedSchema = FormSchemaDefinition.safeParse(form.denormalizedSchema);
  if (!parsedSchema.success) {
    throw new ValidationError('Form schema is invalid');
  }

  const fields = parsedSchema.data.fields ?? parsedSchema.data.pages?.flatMap((page) => page.fields) ?? [];
  const field = fields.find((candidate) => candidate.id === params.fieldId);
  if (!field || field.type !== 'file') {
    throw new ValidationError('Upload sessions can only be created for file fields');
  }

  const allowedMimeTypes = field.validation?.allowedFileTypes?.length
    ? field.validation.allowedFileTypes
    : ['*/*'];
  const maxFileSize = Math.min(
    field.validation?.maxFileSize ?? DEFAULT_SUBMISSION_FILE_MAX_BYTES,
    ABSOLUTE_SUBMISSION_FILE_MAX_BYTES
  );

  if (params.fileSize > maxFileSize) {
    throw new ValidationError(`File size ${params.fileSize} exceeds maximum ${maxFileSize}`);
  }
  if (!mimeMatches(allowedMimeTypes, params.mimeType)) {
    throw new ValidationError(`File type ${params.mimeType} is not allowed for this field`);
  }

  const sessionToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  const [session] = await deps.db.insert(uploadSessions).values({
    sessionToken,
    formId: params.formId,
    allowedMimeTypes,
    maxFileSize,
    uploadPurpose: 'submission',
    expiresAt,
  }).returning();

  logger.info(
    { sessionToken, formId: params.formId, fieldId: params.fieldId },
    '[Uploads] Public submission upload session created'
  );
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
    if (contentType && !mimeMatches(allowedMimeTypes, contentType)) {
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

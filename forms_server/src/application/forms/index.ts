/**
 * Form use cases: create, get, update schema, list, soft-delete.
 */
import { eq, and, desc, count, or, inArray } from 'drizzle-orm';
import type { Database } from '../../infrastructure/db/client.js';
import type { WalrusClient } from '../../infrastructure/walrus/client.js';
import type { SuiBlockchainClient } from '../../infrastructure/sui/client.js';
import { forms, schemaVersions, admins } from '../../infrastructure/db/schema.js';
import type { FormSchemaType } from '../../domain/schemas/form-schema.js';
import { NotFoundError, AuthorizationError } from '../../shared/errors/index.js';
import { logger } from '../../shared/logger.js';

export interface FormDeps {
  db: Database;
  walrus: WalrusClient;
  sui: SuiBlockchainClient;
}

export async function createForm(
  params: { schema: FormSchemaType; isPrivate: boolean; submissionIdentityMode: string },
  wallet: string,
  deps: FormDeps
) {
  // 1. Publish schema to Walrus
  const schemaJson = JSON.stringify(params.schema);
  const { blobId } = await deps.walrus.publishBlob(schemaJson);

  // 2. Register on Sui (async-safe — if it fails, we still have the DB record)
  let suiObjectId: string | null = null;
  try {
    const result = await deps.sui.registerForm({
      schemaBlobId: blobId,
      isPrivate: params.isPrivate,
      submissionIdentityMode: params.submissionIdentityMode === 'anonymous' ? 0 : params.submissionIdentityMode === 'optional_connected' ? 1 : 2,
    });
    suiObjectId = result.suiObjectId;
  } catch (error) {
    logger.warn({ error }, '[Forms] Sui registration failed, continuing without on-chain record');
  }

  // 3. Write to database
  const [form] = await deps.db.insert(forms).values({
    ownerWallet: wallet,
    walrusBlobId: blobId,
    schemaVersion: 1,
    suiObjectId,
    isPrivate: params.isPrivate,
    submissionIdentityMode: params.submissionIdentityMode as 'anonymous' | 'optional_connected' | 'required_connected',
    title: params.schema.title,
    description: params.schema.description ?? null,
    denormalizedSchema: params.schema as unknown as Record<string, unknown>,
  }).returning();

  // 4. Write first schema version
  await deps.db.insert(schemaVersions).values({
    formId: form!.id,
    blobId,
    versionNumber: 1,
    parentBlobId: null,
    suiObjectId: null,
  });

  logger.info({ formId: form!.id, blobId }, '[Forms] Form created');
  return form;
}

export async function getForm(formId: string, deps: Pick<FormDeps, 'db'>) {
  const [form] = await deps.db
    .select()
    .from(forms)
    .where(and(eq(forms.id, formId), eq(forms.isDeleted, false)));

  if (!form) {
    throw new NotFoundError('Form', formId);
  }

  return form;
}

export async function verifyOwnerOrAdmin(form: typeof forms.$inferSelect, wallet: string, db: Database) {
  if (form.ownerWallet === wallet) return;

  const [admin] = await db
    .select({ id: admins.id })
    .from(admins)
    .where(and(eq(admins.formId, form.id), eq(admins.walletAddress, wallet)))
    .limit(1);

  if (!admin) {
    throw new AuthorizationError('Only the form owner or an admin can perform this action');
  }
}

export async function updateFormSchema(
  formId: string,
  params: { schema: FormSchemaType; isPrivate?: boolean; submissionIdentityMode?: string },
  wallet: string,
  deps: FormDeps
) {
  const form = await getForm(formId, deps);
  await verifyOwnerOrAdmin(form, wallet, deps.db);

  // 1. Publish new schema to Walrus
  const schemaJson = JSON.stringify(params.schema);
  const { blobId: newBlobId } = await deps.walrus.publishBlob(schemaJson);
  const newVersion = form.schemaVersion + 1;
  const parentBlobId = form.walrusBlobId;

  // 2. Register schema version on Sui
  let suiObjectId: string | null = null;
  try {
    const result = await deps.sui.registerSchemaVersion({
      formObjectId: form.suiObjectId ?? '',
      ownerCapObjectId: '0x0', // owner cap held in frontend wallet
      newBlobId,
      parentBlobId,
      versionNumber: newVersion,
    });
    suiObjectId = result.suiObjectId;
  } catch (error) {
    logger.warn({ error }, '[Forms] Sui schema version registration failed');
  }

  // 3. Update form + create schema version in DB
  const submissionIdentityMode =
    params.submissionIdentityMode ??
    form.submissionIdentityMode;

  await deps.db.update(forms).set({
    walrusBlobId: newBlobId,
    schemaVersion: newVersion,
    title: params.schema.title,
    description: params.schema.description ?? null,
    denormalizedSchema: params.schema as unknown as Record<string, unknown>,
    ...(params.isPrivate !== undefined ? { isPrivate: params.isPrivate } : {}),
    submissionIdentityMode: submissionIdentityMode as 'anonymous' | 'optional_connected' | 'required_connected',
  }).where(eq(forms.id, formId));

  await deps.db.insert(schemaVersions).values({
    formId,
    blobId: newBlobId,
    versionNumber: newVersion,
    parentBlobId,
    suiObjectId,
  });

  logger.info({ formId, version: newVersion, blobId: newBlobId }, '[Forms] Schema updated');
  return {
    ...form,
    walrusBlobId: newBlobId,
    schemaVersion: newVersion,
    title: params.schema.title,
    description: params.schema.description ?? null,
    denormalizedSchema: params.schema as unknown as Record<string, unknown>,
    isPrivate: params.isPrivate ?? form.isPrivate,
    submissionIdentityMode: submissionIdentityMode as 'anonymous' | 'optional_connected' | 'required_connected',
  };
}

export async function listForms(
  wallet: string,
  page: number,
  pageSize: number,
  deps: Pick<FormDeps, 'db'>
) {
  const offset = (page - 1) * pageSize;

  const whereClause = and(
    eq(forms.isDeleted, false),
    or(
      eq(forms.ownerWallet, wallet),
      inArray(
        forms.id,
        deps.db.select({ formId: admins.formId }).from(admins).where(eq(admins.walletAddress, wallet))
      )
    )
  );

  const [items, [totalResult]] = await Promise.all([
    deps.db
      .select()
      .from(forms)
      .where(whereClause)
      .orderBy(desc(forms.createdAt))
      .limit(pageSize)
      .offset(offset),
    deps.db
      .select({ count: count() })
      .from(forms)
      .where(whereClause),
  ]);

  const total = totalResult?.count ?? 0;

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function deleteForm(
  formId: string,
  wallet: string,
  deps: Pick<FormDeps, 'db'>
) {
  const form = await getForm(formId, deps);

  if (form.ownerWallet !== wallet) {
    throw new AuthorizationError('Only the form owner can delete the form');
  }

  await deps.db.update(forms).set({ isDeleted: true }).where(eq(forms.id, formId));
  logger.info({ formId }, '[Forms] Form soft-deleted');
}

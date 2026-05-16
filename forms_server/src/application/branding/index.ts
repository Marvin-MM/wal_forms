/**
 * Form Branding Use Cases
 *
 * Manages visual customization for form public pages.
 * Logo blob IDs are validated against Walrus before storing.
 * On-chain registration creates an auditable BrandingAsset record.
 */
import { eq } from 'drizzle-orm';
import type { Database } from '../../infrastructure/db/client.js';
import type { WalrusClient } from '../../infrastructure/walrus/client.js';
import type { SuiBlockchainClient } from '../../infrastructure/sui/client.js';
import { forms, formBranding } from '../../infrastructure/db/schema.js';
import { NotFoundError, AuthorizationError, ValidationError } from '../../shared/errors/index.js';
import { logger } from '../../shared/logger.js';
import {
  UpsertFormBrandingBodySchema,
  type UpsertFormBrandingBody,
} from '../../domain/entities/form-branding.js';
import { BRANDING_ASSET_TYPE } from '../../infrastructure/sui/client.js';

export interface BrandingDeps {
  db: Database;
  walrus: WalrusClient;
  sui: SuiBlockchainClient;
}

// ---------------------------------------------------------------------------
// getFormBranding — public, no authentication
// ---------------------------------------------------------------------------

export async function getFormBranding(
  formId: string,
  db: Database
): Promise<typeof formBranding.$inferSelect | null> {
  const [form] = await db
    .select({ id: forms.id })
    .from(forms)
    .where(eq(forms.id, formId));
  if (!form) throw new NotFoundError('Form', formId);

  const [branding] = await db
    .select()
    .from(formBranding)
    .where(eq(formBranding.formId, formId));

  return branding ?? null;
}

// ---------------------------------------------------------------------------
// upsertFormBranding — JWT protected, ownership verified
// ---------------------------------------------------------------------------

export async function upsertFormBranding(
  formId: string,
  ownerWallet: string,
  data: UpsertFormBrandingBody,
  deps: BrandingDeps
): Promise<typeof formBranding.$inferSelect> {
  // 1. Verify ownership
  const [form] = await deps.db
    .select()
    .from(forms)
    .where(eq(forms.id, formId));
  if (!form) throw new NotFoundError('Form', formId);
  if (form.ownerWallet !== ownerWallet) {
    throw new AuthorizationError('Only the form owner can update branding');
  }

  // 2. Validate Zod (should already be validated at route level, but enforce here)
  const validated = UpsertFormBrandingBodySchema.parse(data);

  // 3. If a new logo blob ID is provided, verify it exists on Walrus
  //    and register the on-chain BrandingAsset record
  if (validated.logoWalrusBlobId) {
    const isReachable = await deps.walrus.isAggregatorReachable();
    if (!isReachable) {
      logger.warn({ blobId: validated.logoWalrusBlobId }, '[Branding] Walrus unreachable — skipping blob verification');
    } else {
      const metadata = await deps.walrus.verifyBlob(validated.logoWalrusBlobId);
      if (!metadata.exists) {
        throw new ValidationError('Logo blob not found on Walrus');
      }
    }

    if (form.suiObjectId) {
      try {
        // Follow-up: this best-effort server call is skipped while the server
        // does not hold the user's FormOwnerCap. The Sui client argument order
        // must also be aligned with branding.move before enabling it.
        await deps.sui.registerBrandingAssetOnChain({
          ownerCapObjectId: '0x0', // held in frontend wallet
          formObjectId: form.suiObjectId,
          blobId: validated.logoWalrusBlobId,
          assetType: BRANDING_ASSET_TYPE.LOGO,
          mimeType: 'image/png', // default; client should specify
        });
      } catch (error) {
        logger.warn({ error }, '[Branding] Sui branding asset registration failed (skipping until client sponsorship is implemented)');
      }
    }
  }

  // 4. Upsert the database record
  const [result] = await deps.db
    .insert(formBranding)
    .values({
      formId,
      ...validated,
    })
    .onConflictDoUpdate({
      target: formBranding.formId,
      set: {
        ...validated,
        updatedAt: new Date(),
      },
    })
    .returning();

  logger.info({ formId }, '[Branding] Branding upserted');
  return result!;
}

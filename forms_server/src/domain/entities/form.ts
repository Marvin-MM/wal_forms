/**
 * Form entity — stores form metadata.
 * The denormalized schema is the primary read path for the frontend.
 */
export interface Form {
  id: string;
  ownerWallet: string;
  walrusBlobId: string;
  schemaVersion: number;
  suiObjectId: string | null;
  isPrivate: boolean;
  isDeleted: boolean;
  denormalizedSchema: Record<string, unknown>;
  title: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

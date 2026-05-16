/**
 * Sui RPC client — direct on-chain reads.
 * Never goes through the backend; used for the verification page and on-chain data.
 */
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { env } from "./env";

// Singleton client
let _suiClient: SuiJsonRpcClient | null = null;

export function getSuiClient(): SuiJsonRpcClient {
  if (!_suiClient) {
    _suiClient = new SuiJsonRpcClient({ 
      url: env.NEXT_PUBLIC_SUI_RPC_ENDPOINT,
      network: (env.NEXT_PUBLIC_SUI_NETWORK ?? "testnet") as "testnet" | "mainnet" | "devnet",
    });
  }
  return _suiClient;
}

// ── On-chain object reads ─────────────────────────────────────────────────────

export interface OnChainForm {
  objectId: string;
  owner: string;
  schemaBlobId: string;
  schemaVersion: number;
  isPrivate: boolean;
  isClosed: boolean;
  submissionCount: number;
  createdAt: number;
}

export interface OnChainSubmissionReceipt {
  objectId: string;
  formId: string;
  blobId: string;
  schemaVersion: number;
  submitter: string;
  isEncrypted: boolean;
  timestamp: number;
}

export async function fetchFormObject(objectId: string): Promise<OnChainForm | null> {
  const client = getSuiClient();
  const obj = await client.getObject({
    id: objectId,
    options: { showContent: true },
  });

  if (!obj.data?.content || obj.data.content.dataType !== "moveObject") return null;

  const fields = obj.data.content.fields as Record<string, unknown>;

  return {
    objectId,
    owner: fields["owner"] as string,
    schemaBlobId: Array.isArray(fields["schema_blob_id"])
      ? Buffer.from(fields["schema_blob_id"] as number[]).toString("hex")
      : (fields["schema_blob_id"] as string),
    schemaVersion: Number(fields["schema_version"]),
    isPrivate: Boolean(fields["is_private"]),
    isClosed: Boolean(fields["is_closed"]),
    submissionCount: Number(fields["submission_count"]),
    createdAt: Number(fields["created_at"]),
  };
}

export async function fetchSubmissionReceipt(
  objectId: string
): Promise<OnChainSubmissionReceipt | null> {
  const client = getSuiClient();
  const obj = await client.getObject({
    id: objectId,
    options: { showContent: true },
  });

  if (!obj.data?.content || obj.data.content.dataType !== "moveObject") return null;

  const fields = obj.data.content.fields as Record<string, unknown>;

  return {
    objectId,
    formId: fields["form_id"] as string,
    blobId: Array.isArray(fields["blob_id"])
      ? Buffer.from(fields["blob_id"] as number[]).toString("hex")
      : (fields["blob_id"] as string),
    schemaVersion: Number(fields["schema_version"]),
    submitter: fields["submitter"] as string,
    isEncrypted: Boolean(fields["is_encrypted"]),
    timestamp: Number(fields["timestamp"]),
  };
}

export async function getStats(): Promise<{ totalForms: number; totalSubmissions: number }> {
  // Stats are read from the backend health endpoint, not chain
  return { totalForms: 0, totalSubmissions: 0 };
}

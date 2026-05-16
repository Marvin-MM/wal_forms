/**
 * Seal encryption/decryption — client-side only.
 * Uses the @mysten/seal v1.x API with SessionKey and serverConfigs.
 * Private keys never leave the browser. The server never sees plaintext.
 */
import type { SealConfig } from "../shared/types/api";

/**
 * Encrypt a JSON-serialisable payload using @mysten/seal.
 * Returns the encrypted bytes ready for Walrus upload.
 */
export async function encryptSubmission(
  data: Record<string, unknown>,
  sealConfig: SealConfig,
  _allowedAddress: string
): Promise<Uint8Array> {
  const { SealClient, SessionKey } = await import("@mysten/seal");
  const { SuiJsonRpcClient } = await import("@mysten/sui/jsonRpc");
  const { env } = await import("./env");

  const suiClient = new SuiJsonRpcClient({ 
    url: env.NEXT_PUBLIC_SUI_RPC_ENDPOINT,
    network: (env.NEXT_PUBLIC_SUI_NETWORK ?? "testnet") as "testnet" | "mainnet" | "devnet",
  });

  const client = new SealClient({
    suiClient: suiClient as Parameters<typeof SealClient.prototype.encrypt>[0] extends never ? never : never,
    serverConfigs: sealConfig.keyServerObjectIds.map((objectId) => ({
      objectId,
      weight: 1,
    })),
    verifyKeyServers: false,
  });

  const plaintext = new TextEncoder().encode(JSON.stringify(data));

  const { encryptedObject } = await client.encrypt({
    threshold: 1,
    packageId: sealConfig.packageId,
    id: sealConfig.packageId, // Use packageId as the access identity
    data: plaintext,
  });

  return encryptedObject;
}

export type DecryptSignerFn = (txBytes: Uint8Array) => Promise<{ signature: string; bytes: string }>;

/**
 * Decrypt a Seal-encrypted blob using the connected wallet via SessionKey.
 */
export async function decryptSubmission(
  encryptedBytes: Uint8Array,
  sealConfig: SealConfig,
  address: string,
  signTransaction: DecryptSignerFn
): Promise<Record<string, unknown>> {
  const { SealClient, SessionKey } = await import("@mysten/seal");
  const { SuiJsonRpcClient } = await import("@mysten/sui/jsonRpc");
  const { env } = await import("./env");

  const suiClient = new SuiJsonRpcClient({ 
    url: env.NEXT_PUBLIC_SUI_RPC_ENDPOINT,
    network: (env.NEXT_PUBLIC_SUI_NETWORK ?? "testnet") as "testnet" | "mainnet" | "devnet",
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = new SealClient({
    suiClient: suiClient as any,
    serverConfigs: sealConfig.keyServerObjectIds.map((objectId) => ({
      objectId,
      weight: 1,
    })),
    verifyKeyServers: false,
  });

  // Decrypt using session key
  const sessionKey = await SessionKey.create({
    packageId: sealConfig.packageId,
    address,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    suiClient: suiClient as any,
    signer: signTransaction as unknown as Parameters<typeof SessionKey.create>[0]["signer"],
    ttlMin: 10,
  });

  const decrypted = await client.decrypt({
    data: encryptedBytes,
    sessionKey,
    txBytes: new Uint8Array(0),
  });

  const text = new TextDecoder().decode(decrypted);
  return JSON.parse(text) as Record<string, unknown>;
}

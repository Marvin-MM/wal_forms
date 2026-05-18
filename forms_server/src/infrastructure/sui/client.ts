/**
 * Sui blockchain client.
 *
 * The keypair is treated as OPTIONAL at construction time.
 * If SUI_SERVER_WALLET_PRIVATE_KEY is a placeholder or invalid, the client
 * initialises in a "degraded" (read-only) mode: all write operations log a
 * warning and return a null result instead of crashing the server process.
 *
 * Phase A additions:
 *   - submitAnonymous: executes submit_anonymous entry function
 *   - buildSponsoredTxGasPayment: co-signs unsigned PTB with server gas
 *   - broadcastSponsoredTx: broadcasts a fully-signed sponsored transaction
 *   - access control: createAccessPolicy, updateAccessPolicy, addToAllowlist,
 *       removeFromAllowlist, enforceResponseLimit
 *   - branding: registerBrandingAsset, updateBrandingAsset
 */
import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { logger } from '../../shared/logger.js';
import { ExternalServiceError } from '../../shared/errors/index.js';

export interface SuiClientConfig {
  rpcEndpoint: string;
  serverWalletPrivateKey: string;
  movePackageId: string;
  moveModuleName: string;
}

/** Branding asset type — mirrors Move contract ASSET_* constants */
export const BRANDING_ASSET_TYPE = {
  LOGO: 0,
  BACKGROUND: 1,
  FAVICON: 2,
} as const;

/** Placeholder sentinel — never a real key */
const PLACEHOLDER_KEYS = new Set([
  'suiprivkey1_CHANGE_ME',
  '',
  'CHANGE_ME',
]);

export class SuiBlockchainClient {
  private readonly client: SuiJsonRpcClient;
  private readonly keypair: Ed25519Keypair | null;
  private readonly packageId: string;
  /** true when wallet key is valid and on-chain calls can execute */
  readonly isConfigured: boolean;

  constructor(config: SuiClientConfig) {
    this.client = new SuiJsonRpcClient({ url: config.rpcEndpoint, network: 'testnet' });
    this.packageId = config.movePackageId;

    if (PLACEHOLDER_KEYS.has(config.serverWalletPrivateKey.trim())) {
      this.keypair = null;
      this.isConfigured = false;
      logger.warn(
        '[Sui] SUI_SERVER_WALLET_PRIVATE_KEY is a placeholder — running in read-only/degraded mode. ' +
        'On-chain operations (form registration, submission receipts) will be skipped. ' +
        'Set a real funded key to enable blockchain features.'
      );
      return;
    }

    try {
      this.keypair = Ed25519Keypair.fromSecretKey(config.serverWalletPrivateKey);
      this.isConfigured = true;
      logger.info(
        { address: this.keypair.getPublicKey().toSuiAddress() },
        '[Sui] Server wallet initialized'
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.keypair = null;
      this.isConfigured = false;
      logger.warn(
        { error: msg },
        '[Sui] Invalid private key format — running in degraded mode. On-chain operations will be skipped.'
      );
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Existing methods (unchanged signatures)
  // ───────────────────────────────────────────────────────────────────────────

  async registerForm(params: {
    schemaBlobId: string;
    isPrivate: boolean;
    submissionIdentityMode: number; // 0=anonymous, 1=optional_connected, 2=required_connected
  }): Promise<{ suiObjectId: string | null; ownerCapObjectId: string | null }> {
    if (!this.isReady('registerForm')) return { suiObjectId: null, ownerCapObjectId: null };

    return this.executeWithRetry(async () => {
      const tx = new Transaction();
      tx.moveCall({
        target: `${this.packageId}::form::create`,
        arguments: [
          tx.pure.vector('u8', Array.from(Buffer.from(params.schemaBlobId, 'base64url'))),
          tx.pure.bool(params.isPrivate),
          tx.pure.u8(params.submissionIdentityMode),
        ],
      });
      const result = await this.signAndExecute(tx);
      const objects = this.extractCreatedObjectIdsByType(result);
      const suiObjectId = objects[`${this.packageId}::form::Form`] || null;
      const ownerCapObjectId = objects[`${this.packageId}::form::FormOwnerCap`] || null;
      logger.info({ objectId: suiObjectId, ownerCapObjectId }, '[Sui] Form registered on-chain');
      return { suiObjectId, ownerCapObjectId };
    }, 'registerForm');
  }

  async createSponsorshipPool(params: {
    ownerCapObjectId: string;
    formObjectId: string;
  }): Promise<{ suiObjectId: string | null }> {
    if (!this.isReady('createSponsorshipPool')) return { suiObjectId: null };
    if (params.ownerCapObjectId === '0x0') return { suiObjectId: null };

    return this.executeWithRetry(async () => {
      const tx = new Transaction();
      const serverAddress = this.keypair!.getPublicKey().toSuiAddress();
      tx.moveCall({
        target: `${this.packageId}::sponsorship::create_sponsorship_pool`,
        arguments: [
          tx.object(params.ownerCapObjectId),
          tx.object(params.formObjectId),
          tx.pure.address(serverAddress),
        ],
      });
      const result = await this.signAndExecute(tx);
      const objectId = this.extractCreatedObjectId(result);
      logger.info({ objectId, formId: params.formObjectId }, '[Sui] Sponsorship Pool created on-chain');
      return { suiObjectId: objectId };
    }, 'createSponsorshipPool');
  }

  async registerSchemaVersion(params: {
    formObjectId: string;
    ownerCapObjectId: string;
    newBlobId: string;
    parentBlobId: string | null;
    versionNumber: number;
  }): Promise<{ suiObjectId: string | null }> {
    if (!this.isReady('registerSchemaVersion')) return { suiObjectId: null };
    if (params.ownerCapObjectId === '0x0') return { suiObjectId: null };

    return this.executeWithRetry(async () => {
      const tx = new Transaction();
      tx.moveCall({
        target: `${this.packageId}::form::update_schema`,
        arguments: [
          tx.object(params.ownerCapObjectId),
          tx.object(params.formObjectId),
          tx.pure.vector('u8', Array.from(Buffer.from(params.newBlobId, 'base64url'))),
        ],
      });
      const result = await this.signAndExecute(tx);
      const objectId = this.extractCreatedObjectId(result);
      logger.info({ objectId, version: params.versionNumber }, '[Sui] Schema version registered');
      return { suiObjectId: objectId };
    }, 'registerSchemaVersion');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Change 1 — Anonymous and Sponsored Submissions
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Execute an anonymous submission entirely with the server wallet.
   * Calls submission::submit_anonymous — no client wallet involved.
   */
  async submitAnonymous(params: {
    formObjectId: string;
    blobId: string; // hex-encoded 32-byte Walrus blob ID
    isEncrypted: boolean;
    submitterAddress: string | null; // optional_connected mode only
    sponsorshipPoolObjectId: string | null;
  }): Promise<{ digest: string | null }> {
    if (!this.isReady('submitAnonymous')) return { digest: null };

    return this.executeWithRetry(async () => {
      const tx = new Transaction();
      const serverAddress = this.keypair!.getPublicKey().toSuiAddress();

      tx.moveCall({
        target: `${this.packageId}::submission::submit_anonymous`,
        arguments: [
          tx.object(params.formObjectId),
          tx.pure.vector('u8', Array.from(Buffer.from(params.blobId, 'base64url'))),
          tx.pure.bool(params.isEncrypted),
          // Option<address> for submitter
          params.submitterAddress
            ? tx.pure.option('address', params.submitterAddress)
            : tx.pure.option('address', null),
          // sponsor_address is always the server wallet
          tx.pure.address(serverAddress),
          // SponsorshipPool object (required by contract)
          tx.object(params.sponsorshipPoolObjectId ?? '0x0'),
        ],
      });

      const result = await this.signAndExecute(tx);
      logger.info({ digest: result.digest }, '[Sui] Anonymous submission recorded on-chain');
      return { digest: result.digest };
    }, 'submitAnonymous');
  }

  /**
   * Add server gas sponsorship to a client-built unsigned transaction.
   *
   * Sui sponsored transaction flow:
   *   1. Client builds PTB and signs with their keypair → sends bytes here
   *   2. Server sets gas payment from its wallet, signs as sponsor
   *   3. Server returns the double-signed bytes to the client
   *   4. Client broadcasts the fully-signed transaction
   *
   * @param unsignedTxBytesB64 - Base64-encoded unsigned PTB from the client
   * @returns Base64-encoded fully-signed bytes ready for client broadcast
   */
  async buildSponsoredTxGasPayment(
    unsignedTxBytesB64: string
  ): Promise<{ sponsoredTxBytesB64: string; sponsorSignature: string; sponsorAddress: string }> {
    if (!this.isReady('buildSponsoredTxGasPayment')) {
      throw new ExternalServiceError('Sui', 'Server wallet not configured — cannot sponsor transactions');
    }

    const sponsorAddress = this.keypair!.getPublicKey().toSuiAddress();

    // Deserialize the unsigned PTB
    const txBytes = Uint8Array.from(Buffer.from(unsignedTxBytesB64, 'base64'));
    const tx = Transaction.from(txBytes);

    // Set the gas owner to the server wallet
    tx.setSenderIfNotSet(sponsorAddress);
    await tx.setGasOwner(sponsorAddress);

    // Build the transaction bytes without a client reference
    // (gas budget and price must be set by the client in the original PTB)
    const txBytesForSign = await tx.build();

    // Server (sponsor) signs the tx — this is the gas sponsorship signature
    const sponsorSig = await this.keypair!.signTransaction(txBytesForSign);

    logger.info({ sponsorAddress }, '[Sui] Sponsored transaction gas payment added');

    // Return the built bytes + sponsor signature separately
    // The client will add their own signature, then both are combined for broadcast
    return {
      sponsoredTxBytesB64: Buffer.from(txBytesForSign).toString('base64'),
      sponsorSignature: sponsorSig.signature,
      sponsorAddress,
    };
  }

  /**
   * Broadcast a fully-signed sponsored transaction.
   * Called in phase 2 after the client has added their signature.
   *
   * @param signedTxBytesB64 - Base64 of the fully-signed transaction (client + server sigs)
   * @returns Transaction digest
   */
  async broadcastSponsoredTx(signedTxBytesB64: string): Promise<{ digest: string }> {
    if (!this.isReady('broadcastSponsoredTx')) {
      throw new ExternalServiceError('Sui', 'Server wallet not configured — cannot broadcast');
    }

    return this.executeWithRetry(async () => {
      const txBytes = Uint8Array.from(Buffer.from(signedTxBytesB64, 'base64'));

      const result = await this.client.executeTransactionBlock({
        transactionBlock: Buffer.from(txBytes).toString('base64'),
        signature: [], // signatures are embedded in the signedTxBytes
        options: { showEffects: true },
      });

      if (result.effects?.status?.status !== 'success') {
        throw new Error(`Sponsored transaction failed: ${result.effects?.status?.error ?? 'Unknown'}`);
      }

      logger.info({ digest: result.digest }, '[Sui] Sponsored transaction broadcast');
      return { digest: result.digest };
    }, 'broadcastSponsoredTx');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Change 3 — Access Control On-Chain Operations
  // ───────────────────────────────────────────────────────────────────────────

  async createAccessPolicyOnChain(params: {
    ownerCapObjectId: string;
    formObjectId: string;
    requiresAllowlist: boolean;
    hasResponseLimit: boolean;
    responseLimit: number | null;
    opensAt: number | null;      // epoch number, null = no restriction
    closesAt: number | null;     // epoch number, null = no restriction
    passwordHash: string | null; // hex-encoded SHA3-256 hash, null = no password
  }): Promise<{ suiObjectId: string | null }> {
    if (!this.isReady('createAccessPolicyOnChain')) return { suiObjectId: null };
    if (params.ownerCapObjectId === '0x0') return { suiObjectId: null };

    return this.executeWithRetry(async () => {
      const tx = new Transaction();
      tx.moveCall({
        target: `${this.packageId}::access::create_access_policy`,
        arguments: [
          tx.object(params.ownerCapObjectId),
          tx.object(params.formObjectId),
          tx.pure.bool(params.requiresAllowlist),
          tx.pure.bool(params.hasResponseLimit),
          tx.pure.u64(params.responseLimit ?? 0),
          params.opensAt !== null
            ? tx.pure.option('u64', params.opensAt)
            : tx.pure.option('u64', null),
          params.closesAt !== null
            ? tx.pure.option('u64', params.closesAt)
            : tx.pure.option('u64', null),
          params.passwordHash !== null
            ? tx.pure.option('vector<u8>', Array.from(Buffer.from(params.passwordHash, 'hex')))
            : tx.pure.option('vector<u8>', null),
        ],
      });
      const result = await this.signAndExecute(tx);
      const objectId = this.extractCreatedObjectId(result);
      logger.info({ objectId }, '[Sui] Access policy created on-chain');
      return { suiObjectId: objectId };
    }, 'createAccessPolicyOnChain');
  }

  async addToAllowlistOnChain(params: {
    ownerCapObjectId: string;
    policyObjectId: string;
    allowedAddress: string;
  }): Promise<{ digest: string | null }> {
    if (!this.isReady('addToAllowlistOnChain')) return { digest: null };
    if (params.ownerCapObjectId === '0x0') return { digest: null };

    return this.executeWithRetry(async () => {
      const tx = new Transaction();
      tx.moveCall({
        target: `${this.packageId}::access::add_to_allowlist`,
        arguments: [
          tx.object(params.ownerCapObjectId),
          tx.object(params.policyObjectId),
          tx.pure.address(params.allowedAddress),
        ],
      });
      const result = await this.signAndExecute(tx);
      logger.info({ address: params.allowedAddress }, '[Sui] Address added to allowlist on-chain');
      return { digest: result.digest };
    }, 'addToAllowlistOnChain');
  }

  async removeFromAllowlistOnChain(params: {
    ownerCapObjectId: string;
    policyObjectId: string;
    addressToRemove: string;
  }): Promise<{ digest: string | null }> {
    if (!this.isReady('removeFromAllowlistOnChain')) return { digest: null };
    if (params.ownerCapObjectId === '0x0') return { digest: null };

    return this.executeWithRetry(async () => {
      const tx = new Transaction();
      tx.moveCall({
        target: `${this.packageId}::access::remove_from_allowlist`,
        arguments: [
          tx.object(params.ownerCapObjectId),
          tx.object(params.policyObjectId),
          tx.pure.address(params.addressToRemove),
        ],
      });
      const result = await this.signAndExecute(tx);
      logger.info({ address: params.addressToRemove }, '[Sui] Address removed from allowlist on-chain');
      return { digest: result.digest };
    }, 'removeFromAllowlistOnChain');
  }

  async enforceResponseLimitOnChain(params: {
    ownerCapObjectId: string;
    policyObjectId: string;
    formObjectId: string;
  }): Promise<{ digest: string | null }> {
    if (!this.isReady('enforceResponseLimitOnChain')) return { digest: null };
    if (params.ownerCapObjectId === '0x0') return { digest: null };

    return this.executeWithRetry(async () => {
      const tx = new Transaction();
      tx.moveCall({
        target: `${this.packageId}::access::check_and_enforce_response_limit`,
        arguments: [
          tx.object(params.ownerCapObjectId),
          tx.object(params.policyObjectId),
          tx.object(params.formObjectId),
        ],
      });
      const result = await this.signAndExecute(tx);
      logger.info({ formId: params.formObjectId }, '[Sui] Response limit enforced on-chain');
      return { digest: result.digest };
    }, 'enforceResponseLimitOnChain');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Change 2 — Branding On-Chain Operations
  // ───────────────────────────────────────────────────────────────────────────

  async registerBrandingAssetOnChain(params: {
    ownerCapObjectId: string;
    formObjectId: string;
    blobId: string; // hex-encoded 32-byte Walrus blob ID
    assetType: number; // BRANDING_ASSET_TYPE constant
    mimeType: string;
  }): Promise<{ suiObjectId: string | null }> {
    if (!this.isReady('registerBrandingAssetOnChain')) return { suiObjectId: null };
    if (params.ownerCapObjectId === '0x0') return { suiObjectId: null };

    return this.executeWithRetry(async () => {
      const tx = new Transaction();
      tx.moveCall({
        target: `${this.packageId}::branding::register_branding_asset`,
        arguments: [
          tx.object(params.ownerCapObjectId),
          tx.object(params.formObjectId),
          tx.pure.vector('u8', Array.from(Buffer.from(params.blobId, 'base64url'))),
          tx.pure.u8(params.assetType),
          tx.pure.string(params.mimeType),
        ],
      });
      const result = await this.signAndExecute(tx);
      const objectId = this.extractCreatedObjectId(result);
      logger.info({ objectId, assetType: params.assetType }, '[Sui] Branding asset registered on-chain');
      return { suiObjectId: objectId };
    }, 'registerBrandingAssetOnChain');
  }

  getServerWalletAddress(): string | null {
    return this.keypair?.getPublicKey().toSuiAddress() ?? null;
  }

  getSuiClient(): SuiJsonRpcClient {
    return this.client;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ───────────────────────────────────────────────────────────────────────────

  private isReady(operation: string): boolean {
    if (!this.keypair) {
      logger.warn(`[Sui] Skipping ${operation} — wallet not configured`);
      return false;
    }
    return true;
  }

  private async signAndExecute(tx: Transaction) {
    const result = await this.client.signAndExecuteTransaction({
      transaction: tx,
      signer: this.keypair!,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    if (result.effects?.status?.status !== 'success') {
      throw new Error(
        `Transaction failed: ${result.effects?.status?.error ?? 'Unknown error'}`
      );
    }

    return result;
  }

  private extractCreatedObjectId(result: {
    effects?: { created?: Array<{ reference: { objectId: string } }> } | null;
    objectChanges?: Array<{ type: string; objectId?: string }> | null;
    digest: string;
  }): string {
    const created = result.effects?.created;
    if (created && created.length > 0) {
      return created[0]!.reference.objectId;
    }
    if (result.objectChanges) {
      const createdChange = result.objectChanges.find((c) => c.type === 'created');
      if (createdChange?.objectId) return createdChange.objectId;
    }
    return result.digest;
  }

  private extractCreatedObjectIdsByType(result: {
    objectChanges?: Array<{ type: string; objectId?: string; objectType?: string }> | null;
  }): Record<string, string> {
    const ids: Record<string, string> = {};
    if (result.objectChanges) {
      for (const change of result.objectChanges) {
        if (change.type === 'created' && change.objectType && change.objectId) {
          ids[change.objectType] = change.objectId;
        }
      }
    }
    return ids;
  }

  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    operationName: string,
    maxRetries = 3
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
          logger.warn(
            { attempt: attempt + 1, maxRetries, delay: Math.round(delay), error: lastError.message },
            `[Sui] ${operationName} failed, retrying...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw new ExternalServiceError('Sui', lastError?.message ?? 'Unknown error');
  }
}

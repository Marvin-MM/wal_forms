/**
 * Seal threshold encryption client.
 *
 * Architecture note — how Seal works:
 * ─────────────────────────────────────────────────────────────────────────────
 * Seal is NOT a single global smart contract you call. It's a two-part system:
 *
 *   1. Key Servers  — Mysten Labs (or third-party) run key servers whose
 *      Sui Object IDs you reference when encrypting / granting decryption access.
 *      → Set SEAL_KEY_SERVER_OBJECT_IDS in .env (comma-separated Sui Object IDs).
 *
 *   2. Your Move package — You define a `seal_approve` function in your own
 *      deployed contract that encodes WHO can decrypt. The Seal SDK passes your
 *      package ID to the key server so it knows which policy to evaluate.
 *      → Set SUI_MOVE_PACKAGE_ID — it doubles as the Seal policy package ID.
 *
 * The SERVER does not encrypt or decrypt directly. Encryption happens client-
 * side (browser) using @mysten/seal. The server's role is:
 *   a) Return the key server Object IDs so the client knows which servers to use.
 *   b) Optionally track which wallets are allowed (stored in our DB, mirrored
 *      in the on-chain allowlist via Sui Move calls).
 *
 * References:
 *   https://seal-docs.wal.app
 *   https://github.com/MystenLabs/seal
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { logger } from '../../shared/logger.js';

export interface SealClientConfig {
  /** Comma-separated Sui Object IDs of Seal key servers */
  keyServerObjectIds: string;
  /** Your WalrusForms Move package ID — used as the Seal policy package */
  packageId: string;
}

export class SealClient {
  readonly keyServerIds: string[];
  readonly packageId: string;

  constructor(config: SealClientConfig) {
    this.keyServerIds = config.keyServerObjectIds
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    this.packageId = config.packageId;

    logger.info(
      { keyServerCount: this.keyServerIds.length, packageId: this.packageId },
      '[Seal] Client initialized'
    );
  }

  /**
   * Returns the configuration the frontend needs to perform client-side encryption.
   * The browser's @mysten/seal SDK will use these to contact key servers and
   * apply your on-chain access policy.
   */
  getEncryptionConfig(): {
    keyServerObjectIds: string[];
    packageId: string;
    threshold: number;
  } {
    return {
      keyServerObjectIds: this.keyServerIds,
      packageId: this.packageId,
      // Threshold = ceil(n/2): majority of key servers must agree to grant access.
      threshold: Math.ceil(this.keyServerIds.length / 2),
    };
  }

  /**
   * Checks whether Seal is fully configured (real package ID + key servers).
   * If false, encrypted submissions are not possible.
   */
  isConfigured(): boolean {
    return (
      this.keyServerIds.length > 0 &&
      !this.packageId.includes('CHANGE_ME')
    );
  }

  /**
   * Log the current Seal configuration for diagnostics.
   */
  logStatus(): void {
    if (this.isConfigured()) {
      logger.info(
        {
          keyServers: this.keyServerIds,
          threshold: Math.ceil(this.keyServerIds.length / 2),
          policyPackage: this.packageId,
        },
        '[Seal] Encryption is ENABLED'
      );
    } else {
      logger.warn(
        '[Seal] Encryption is DISABLED — deploy your Move contract and set SUI_MOVE_PACKAGE_ID to enable encrypted submissions'
      );
    }
  }
}

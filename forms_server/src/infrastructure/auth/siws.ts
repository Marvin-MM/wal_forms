/**
 * Sign in with Sui (SiWS) — nonce management and signature verification.
 */
import { verifyPersonalMessageSignature } from '@mysten/sui/verify';
import { logger } from '../../shared/logger.js';
import { AuthenticationError } from '../../shared/errors/index.js';

// In-memory nonce store with TTL (5 minutes)
const NONCE_TTL_MS = 5 * 60 * 1000;
const nonceStore = new Map<string, { nonce: string; expiresAt: number }>();

// Cleanup expired nonces every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of nonceStore) {
    if (entry.expiresAt <= now) nonceStore.delete(key);
  }
}, 60_000);

export function generateNonce(walletAddress: string): string {
  const nonce = crypto.randomUUID();
  nonceStore.set(walletAddress, {
    nonce,
    expiresAt: Date.now() + NONCE_TTL_MS,
  });
  logger.debug({ walletAddress }, '[SiWS] Nonce generated');
  return nonce;
}

export function consumeNonce(walletAddress: string, nonce: string): boolean {
  const entry = nonceStore.get(walletAddress);
  if (!entry) return false;
  if (entry.nonce !== nonce) return false;
  if (entry.expiresAt <= Date.now()) {
    nonceStore.delete(walletAddress);
    return false;
  }
  nonceStore.delete(walletAddress);
  return true;
}

export async function verifySiWSSignature(
  message: string,
  signature: string,
  expectedWallet: string,
  client?: any
): Promise<boolean> {
  try {
    const messageBytes = new TextEncoder().encode(message);
    const publicKey = await verifyPersonalMessageSignature(messageBytes, signature, { client });
    const derivedAddress = publicKey.toSuiAddress();
    const isValid = derivedAddress === expectedWallet;
    if (!isValid) {
      logger.warn({ expected: expectedWallet, derived: derivedAddress }, '[SiWS] Address mismatch');
    }
    return isValid;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.warn({ error: msg }, '[SiWS] Signature verification failed');
    throw new AuthenticationError('Invalid signature');
  }
}

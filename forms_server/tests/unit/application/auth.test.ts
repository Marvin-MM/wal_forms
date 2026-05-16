/**
 * Unit tests for auth use cases.
 */
import { describe, expect, it } from 'bun:test';
import { requestNonce } from '../../../src/application/auth/index.js';

describe('Auth Use Cases', () => {
  describe('requestNonce', () => {
    it('should generate a nonce for a wallet address', async () => {
      const result = await requestNonce('0xabc123def456');
      expect(result).toHaveProperty('nonce');
      expect(typeof result.nonce).toBe('string');
      expect(result.nonce.length).toBeGreaterThan(0);
    });

    it('should generate different nonces for the same wallet', async () => {
      const result1 = await requestNonce('0xsameWallet');
      const result2 = await requestNonce('0xsameWallet');
      // The second call overwrites the first nonce
      expect(result1.nonce).not.toBe(result2.nonce);
    });

    it('should generate different nonces for different wallets', async () => {
      const result1 = await requestNonce('0xwallet1');
      const result2 = await requestNonce('0xwallet2');
      expect(result1.nonce).not.toBe(result2.nonce);
    });
  });
});

/**
 * Auth use cases: nonce request, SiWS verification, token refresh.
 */
import { generateNonce, consumeNonce, verifySiWSSignature } from '../../infrastructure/auth/siws.js';
import type { JwtService } from '../../infrastructure/auth/jwt.js';
import { AuthenticationError } from '../../shared/errors/index.js';

export async function requestNonce(walletAddress: string): Promise<{ nonce: string }> {
  const nonce = generateNonce(walletAddress);
  return { nonce };
}

export async function verifySiWS(
  params: { walletAddress: string; signedMessage: string; signature: string; nonce: string },
  jwtService: JwtService,
  suiClient?: any
): Promise<{ accessToken: string; refreshToken: string }> {
  // Verify nonce
  const nonceValid = consumeNonce(params.walletAddress, params.nonce);
  if (!nonceValid) {
    throw new AuthenticationError('Invalid or expired nonce');
  }

  // Verify signature
  const isValid = await verifySiWSSignature(
    params.signedMessage,
    params.signature,
    params.walletAddress,
    suiClient
  );
  if (!isValid) {
    throw new AuthenticationError('Signature verification failed');
  }

  // Issue tokens
  const payload = { wallet: params.walletAddress, role: 'user' };
  const [accessToken, refreshToken] = await Promise.all([
    jwtService.signAccessToken(payload),
    jwtService.signRefreshToken(payload),
  ]);

  return { accessToken, refreshToken };
}

export async function refreshToken(
  currentRefreshToken: string,
  jwtService: JwtService
): Promise<{ accessToken: string; refreshToken: string }> {
  const payload = await jwtService.verify(currentRefreshToken);
  const [accessToken, newRefreshToken] = await Promise.all([
    jwtService.signAccessToken(payload),
    jwtService.signRefreshToken(payload),
  ]);
  return { accessToken, refreshToken: newRefreshToken };
}

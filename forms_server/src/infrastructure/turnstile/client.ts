/**
 * Cloudflare Turnstile verification client.
 * Verifies tokens server-side against Cloudflare's siteverify API.
 */
import { logger } from '../../shared/logger.js';

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstileToken(
  token: string,
  secretKey: string,
  remoteIp?: string
): Promise<boolean> {
  try {
    const body: Record<string, string> = {
      secret: secretKey,
      response: token,
    };

    if (remoteIp) {
      body['remoteip'] = remoteIp;
    }

    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      logger.warn({ status: response.status }, '[Turnstile] Verification request failed');
      return false;
    }

    const result = await response.json() as { success: boolean; 'error-codes'?: string[] };

    if (!result.success) {
      logger.warn({ errors: result['error-codes'] }, '[Turnstile] Token verification failed');
    }

    return result.success;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: msg }, '[Turnstile] Verification error');
    return false;
  }
}

/**
 * Generic Webhook client integration.
 */
import { createHmac } from 'crypto';
import { logger } from '../../shared/logger.js';
import { ExternalServiceError } from '../../shared/errors/index.js';

export class WebhookClient {
  /**
   * Send a JSON payload to a generic webhook URL.
   * If a secret is provided, computes a HMAC SHA256 signature and attaches it in the headers.
   */
  async sendWebhook(url: string, payload: Record<string, unknown>, secret?: string | null): Promise<void> {
    try {
      const body = JSON.stringify(payload);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'WalrusForms-Webhook/1.0',
      };

      if (secret) {
        const signature = createHmac('sha256', secret).update(body).digest('hex');
        headers['X-WalrusForms-Signature'] = `sha256=${signature}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
        // Short timeout so we don't hang Inngest jobs indefinitely
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      logger.info({ url }, '[Webhook] Successfully delivered');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error({ url, error: msg }, '[Webhook] Delivery failed');
      throw new ExternalServiceError('Webhook', msg);
    }
  }
}

/**
 * Discord Webhook client integration.
 */
import { logger } from '../../shared/logger.js';
import { ExternalServiceError } from '../../shared/errors/index.js';

export interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: number; // hex color code as integer
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  timestamp?: string; // ISO8601
}

export class DiscordClient {
  /**
   * Send a message to a Discord webhook URL using their standard webhook payload format.
   */
  async sendWebhook(url: string, content: string, embeds?: DiscordEmbed[]): Promise<void> {
    try {
      const payload = {
        content: content || null,
        embeds: embeds && embeds.length > 0 ? embeds : undefined,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      logger.info({ url: url.substring(0, 40) + '...' }, '[Discord] Webhook delivered');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error({ error: msg }, '[Discord] Webhook delivery failed');
      throw new ExternalServiceError('Discord', msg);
    }
  }
}

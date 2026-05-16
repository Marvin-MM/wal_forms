/**
 * Resend email client integration.
 */
import { Resend } from 'resend';
import { logger } from '../../shared/logger.js';
import { ExternalServiceError } from '../../shared/errors/index.js';

export interface ResendClientConfig {
  apiKey: string;
  fromEmail: string;
}

export class ResendClient {
  private resend: Resend;
  private fromEmail: string;

  constructor(config: ResendClientConfig) {
    this.resend = new Resend(config.apiKey);
    this.fromEmail = config.fromEmail;
  }

  async sendEmail(options: { to: string[]; subject: string; html: string; text?: string }): Promise<{ id: string }> {
    if (!options.to || options.to.length === 0) {
      throw new Error('Missing recipient email addresses');
    }

    // For testing without a configured domain, we might hit errors unless using a verified domain.
    // The implementation plan suggested we will handle domain issues if they arise.
    try {
      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      logger.info({ messageId: result.data?.id, to: options.to }, '[Resend] Email sent');
      return { id: result.data?.id ?? 'unknown' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error({ error: msg, to: options.to }, '[Resend] Failed to send email');
      throw new ExternalServiceError('Resend', msg);
    }
  }
}

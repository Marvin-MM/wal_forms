/**
 * Notification background jobs.
 */
import { inngest } from '../client.js';
import { getDatabase } from '../../db/client.js';
import { notificationPreferences, notificationLogs } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { logger } from '../../../shared/logger.js';
import { ResendClient } from '../../notifications/resend.client.js';
import { DiscordClient } from '../../notifications/discord.client.js';
import { WebhookClient } from '../../notifications/webhook.client.js';
import { validateEnv } from '../../../shared/config/env.js';

export const sendSubmissionNotification: ReturnType<typeof inngest.createFunction> = inngest.createFunction(
  {
    id: 'send-submission-notification',
    name: 'Send Submission Notification',
    triggers: [{ event: 'forms/submission.created' }],
  },
  async ({ event, step }) => {
    const { formId, submissionId } = event.data;
    
    await step.run('send-notifications', async () => {
      const env = validateEnv();
      const db = getDatabase();
      const [prefs] = await db.select().from(notificationPreferences).where(eq(notificationPreferences.formId, formId));
      
      if (!prefs || prefs.frequency !== 'immediate') {
        return { skipped: true, reason: 'No immediate notifications configured' };
      }

      const resendClient = new ResendClient({ apiKey: env.RESEND_API_KEY, fromEmail: env.RESEND_FROM_EMAIL });
      const discordClient = new DiscordClient();
      const webhookClient = new WebhookClient();

      if (prefs.emailAddresses && prefs.emailAddresses.length > 0) {
        try {
          await resendClient.sendEmail({
            to: prefs.emailAddresses,
            subject: 'New Submission on WalrusForms',
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #eaeaea; border-radius: 8px; background-color: #ffffff;">
                <div style="text-align: center; margin-bottom: 24px;">
                  <h2 style="color: #111827; margin: 0; font-size: 24px; font-weight: 600;">New Form Submission</h2>
                  <p style="color: #6b7280; margin-top: 8px; font-size: 15px;">A new response was recorded securely.</p>
                </div>
                <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; border: 1px solid #f3f4f6; margin-bottom: 24px;">
                  <p style="margin: 0 0 12px; color: #4b5563; font-size: 14px;"><strong>Form ID:</strong> <span style="color: #111827; font-family: monospace;">${formId}</span></p>
                  <p style="margin: 0; color: #4b5563; font-size: 14px;"><strong>Submission ID:</strong> <span style="color: #111827; font-family: monospace;">${submissionId}</span></p>
                </div>
                <div style="text-align: center; margin-bottom: 32px;">
                  <a href="${env.CORS_ALLOWED_ORIGINS}/dashboard/${formId}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 15px;">View Submission</a>
                </div>
                <div style="border-top: 1px solid #eaeaea; padding-top: 20px; text-align: center; color: #9ca3af; font-size: 13px;">
                  <p style="margin: 0;">Powered by <strong>WalrusForms</strong></p>
                  <p style="margin: 4px 0 0;">Decentralized & On-chain Verifiable</p>
                </div>
              </div>
            `,
          });
          await db.insert(notificationLogs).values({ formId, channel: 'email', type: 'submission', status: 'success' });
        } catch (e) {
          logger.error(e, '[Notifications] Email failed');
          await db.insert(notificationLogs).values({ formId, channel: 'email', type: 'submission', status: 'failed', errorDetails: String(e) });
        }
      }

      if (prefs.discordWebhookUrl) {
        try {
          await discordClient.sendWebhook(prefs.discordWebhookUrl, `A new submission was received for form ID: ${formId}`);
          await db.insert(notificationLogs).values({ formId, channel: 'discord', type: 'submission', status: 'success' });
        } catch (e) {
          logger.error(e, '[Notifications] Discord failed');
          await db.insert(notificationLogs).values({ formId, channel: 'discord', type: 'submission', status: 'failed', errorDetails: String(e) });
        }
      }

      if (prefs.customWebhookUrl) {
        try {
          await webhookClient.sendWebhook(prefs.customWebhookUrl, { event: 'submission.created', formId, submissionId }, prefs.customWebhookSecret);
          await db.insert(notificationLogs).values({ formId, channel: 'webhook', type: 'submission', status: 'success' });
        } catch (e) {
          logger.error(e, '[Notifications] Webhook failed');
          await db.insert(notificationLogs).values({ formId, channel: 'webhook', type: 'submission', status: 'failed', errorDetails: String(e) });
        }
      }

      return { processed: true };
    });
  }
);

export const sendDigestNotifications: ReturnType<typeof inngest.createFunction> = inngest.createFunction(
  {
    id: 'send-digest-notifications',
    name: 'Send Digest Notifications',
    triggers: [{ cron: '0 * * * *' }], // Runs hourly, logic inside decides hourly vs daily based on prefs
  },
  async () => {
    // Simplified stub for digest logic
    logger.info('[Notifications] Running digest notifications check');
  }
);

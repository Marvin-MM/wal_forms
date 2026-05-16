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

      const resendClient = new ResendClient({ apiKey: env.RESEND_API_KEY, fromEmail: 'noreply@walrusforms.com' });
      const discordClient = new DiscordClient();
      const webhookClient = new WebhookClient();

      if (prefs.emailAddresses && prefs.emailAddresses.length > 0) {
        try {
          await resendClient.sendEmail({
            to: prefs.emailAddresses,
            subject: 'New Submission on WalrusForms',
            html: `<p>A new submission was received for form ID: ${formId}</p>`,
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

/**
 * Notification Preference domain entity.
 */
import { z } from 'zod';

export const NotificationFrequencyEnum = z.enum(['immediate', 'hourly', 'daily']);
export type NotificationFrequency = z.infer<typeof NotificationFrequencyEnum>;

export const NotificationPreferenceSchema = z.object({
  id: z.string().uuid(),
  formId: z.string().uuid(),
  emailAddresses: z.array(z.string().email()).max(5, 'Maximum 5 email addresses allowed'),
  discordWebhookUrl: z.string().url().max(500).nullable().optional(),
  customWebhookUrl: z.string().url().max(500).nullable().optional(),
  customWebhookSecret: z.string().max(255).nullable().optional(),
  frequency: NotificationFrequencyEnum,
});

export type NotificationPreference = z.infer<typeof NotificationPreferenceSchema>;

export const UpsertNotificationPreferenceBodySchema = NotificationPreferenceSchema.pick({
  emailAddresses: true,
  discordWebhookUrl: true,
  customWebhookUrl: true,
  customWebhookSecret: true,
  frequency: true,
});

export type UpsertNotificationPreferenceBody = z.infer<typeof UpsertNotificationPreferenceBodySchema>;

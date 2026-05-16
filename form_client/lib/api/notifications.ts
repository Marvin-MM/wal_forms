import { apiRequest } from "./client";
import type { NotificationPreferences } from "../../shared/types/entities";

export type UpsertNotificationPrefsInput = Partial<
  Omit<NotificationPreferences, "id" | "formId" | "createdAt" | "updatedAt">
>;

export async function getNotificationPrefs(
  formId: string
): Promise<NotificationPreferences | null> {
  try {
    return await apiRequest<NotificationPreferences>(
      `/forms/${formId}/notifications/preferences`
    );
  } catch {
    return null;
  }
}

export async function upsertNotificationPrefs(
  formId: string,
  input: UpsertNotificationPrefsInput
): Promise<NotificationPreferences> {
  return apiRequest<NotificationPreferences>(
    `/forms/${formId}/notifications/preferences`,
    { method: "PUT", body: input }
  );
}

export async function sendTestNotification(
  formId: string,
  channel: "email" | "webhook" | "discord"
): Promise<{ sent: boolean }> {
  return apiRequest<{ sent: boolean }>(`/forms/${formId}/notifications/test`, {
    method: "POST",
    body: { channel },
  });
}

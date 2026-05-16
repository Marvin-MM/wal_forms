"use client";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { toast } from "sonner";
import { getNotificationPrefs, upsertNotificationPrefs } from "../../lib/api/notifications";
import { queryKeys } from "../../lib/query-keys";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import type { NotificationFrequency } from "../../shared/types/entities";

interface NotificationSettingsPanelProps {
  formId: string;
  onClose: () => void;
}

export function NotificationSettingsPanel({ formId, onClose }: NotificationSettingsPanelProps) {
  const qc = useQueryClient();
  const { data: prefs } = useQuery({
    queryKey: queryKeys.notifications.prefs(formId),
    queryFn: () => getNotificationPrefs(formId),
  });

  const [emails, setEmails] = useState(prefs?.emailAddresses.join(", ") ?? "");
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState(prefs?.discordWebhookUrl ?? "");
  const [customWebhookUrl, setCustomWebhookUrl] = useState(prefs?.customWebhookUrl ?? "");
  const [customWebhookSecret, setCustomWebhookSecret] = useState(prefs?.customWebhookSecret ?? "");
  const [frequency, setFrequency] = useState<NotificationFrequency>(prefs?.frequency ?? "immediate");

  useEffect(() => {
    queueMicrotask(() => {
      setEmails(prefs?.emailAddresses.join(", ") ?? "");
      setDiscordWebhookUrl(prefs?.discordWebhookUrl ?? "");
      setCustomWebhookUrl(prefs?.customWebhookUrl ?? "");
      setCustomWebhookSecret(prefs?.customWebhookSecret ?? "");
      setFrequency(prefs?.frequency ?? "immediate");
    });
  }, [prefs]);

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => upsertNotificationPrefs(formId, {
      emailAddresses: emails.split(",").map((email) => email.trim()).filter(Boolean),
      discordWebhookUrl: discordWebhookUrl || null,
      customWebhookUrl: customWebhookUrl || null,
      customWebhookSecret: customWebhookSecret || null,
      frequency,
    }),
    onSuccess: (next) => {
      qc.setQueryData(queryKeys.notifications.prefs(formId), next);
      toast.success("Notification settings saved");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to save notifications"),
  });

  return (
    <div className="border-b border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Notifications</h2>
          <p className="text-xs text-[var(--text-tertiary)]">
            Configure immediate or digest delivery for new submissions.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close notifications">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Input
          label="Email addresses"
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
          placeholder="ops@example.com, team@example.com"
        />
        <Select
          label="Frequency"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as NotificationFrequency)}
          options={[
            { label: "Immediate", value: "immediate" },
            { label: "Hourly", value: "hourly" },
            { label: "Daily", value: "daily" },
          ]}
        />
        <Input
          label="Discord webhook"
          value={discordWebhookUrl}
          onChange={(e) => setDiscordWebhookUrl(e.target.value)}
          placeholder="https://discord.com/api/webhooks/..."
        />
        <Input
          label="Custom webhook"
          value={customWebhookUrl}
          onChange={(e) => setCustomWebhookUrl(e.target.value)}
          placeholder="https://example.com/webhook"
        />
        <Input
          label="Webhook secret"
          value={customWebhookSecret}
          onChange={(e) => setCustomWebhookSecret(e.target.value)}
          placeholder="Optional signing secret"
          className="md:col-span-2"
        />
      </div>

      <div className="mt-4 flex justify-end">
        <Button variant="primary" size="sm" loading={isPending} onClick={() => save()}>
          Save notifications
        </Button>
      </div>
    </div>
  );
}

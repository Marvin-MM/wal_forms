"use client";
import { useBuilderStore } from "../../store/builder";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Input";
import { Switch } from "../ui/Select";

export function FormSettings() {
  const { settings, updateSettings } = useBuilderStore();

  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-5 space-y-4">
      <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-widest">
        Form Settings
      </h2>
      <Input
        label="Form name"
        required
        value={settings.title}
        onChange={(e) => updateSettings({ title: e.target.value })}
        placeholder="Untitled Form"
      />
      <div className="w-full space-y-1.5">
        <label className="block text-sm font-medium text-[var(--text-primary)]">Description</label>
        <textarea
          value={settings.description}
          onChange={(e) => updateSettings({ description: e.target.value })}
          placeholder="Optional description shown to respondents..."
          rows={2}
          className="w-full rounded-lg border px-3 py-2 text-sm resize-none bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border-default)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20 transition-colors"
        />
      </div>
      <Switch
        id="form-private"
        checked={settings.isPrivate}
        onChange={(v) => updateSettings({ isPrivate: v })}
        label="Private form (Seal encrypted)"
        description="Submissions are encrypted client-side before upload. Only you can decrypt."
      />
      <Switch
        id="form-auth"
        checked={settings.requireAuthentication}
        onChange={(v) => updateSettings({ requireAuthentication: v })}
        label="Require wallet to submit"
        description="Submitters must connect a Sui wallet. Their address is recorded."
      />
    </div>
  );
}

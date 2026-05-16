"use client";
import { useBuilderStore } from "../../store/builder";
import { Input } from "../ui/Input";
import { Switch } from "../ui/Select";
import { cn } from "../../lib/utils";

const IDENTITY_OPTIONS = [
  { value: "anonymous", label: "Anonymous", description: "No wallet required" },
  { value: "optional_connected", label: "Optional", description: "Wallet can be recorded" },
  { value: "required_connected", label: "Required", description: "Wallet must sign" },
] as const;

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
      <div className="space-y-2">
        <p className="text-sm font-medium text-[var(--text-primary)]">Submission identity</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {IDENTITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateSettings({ submissionIdentityMode: option.value })}
              className={cn(
                "rounded-lg border px-3 py-2 text-left transition-colors",
                settings.submissionIdentityMode === option.value
                  ? "border-[var(--color-brand-500)] bg-[var(--color-brand-500)]/10"
                  : "border-[var(--border-default)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-subtle)]"
              )}
              aria-pressed={settings.submissionIdentityMode === option.value}
            >
              <span className="block text-xs font-semibold text-[var(--text-primary)]">
                {option.label}
              </span>
              <span className="block text-[11px] text-[var(--text-tertiary)]">
                {option.description}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

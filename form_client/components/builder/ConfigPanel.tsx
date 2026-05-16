"use client";
import { useState } from "react";
import { useBuilderStore } from "../../store/builder";
import { Input } from "../ui/Input";
import { Switch } from "../ui/Select";
import { BrandingPanel } from "./BrandingPanel";
import { AccessPanel } from "./AccessPanel";
import { cn } from "../../lib/utils";
import type { FormField } from "../../shared/schemas/form-schema";

type Tab = "field" | "branding" | "access";

const IDENTITY_OPTIONS = [
  { value: "anonymous", label: "Anonymous", description: "No wallet" },
  { value: "optional_connected", label: "Optional", description: "Wallet optional" },
  { value: "required_connected", label: "Required", description: "Wallet required" },
] as const;

interface ConfigPanelProps {
  formId?: string;
}

export function ConfigPanel({ formId }: ConfigPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("field");
  const { fields, selectedFieldId, updateField } = useBuilderStore();
  const field = fields.find((f) => f.id === selectedFieldId);

  const tabs: { id: Tab; label: string }[] = [
    { id: "field", label: "Field" },
    { id: "branding", label: "Branding" },
    { id: "access", label: "Access" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-[var(--border-default)] shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 py-2.5 text-xs font-semibold transition-colors",
              activeTab === tab.id
                ? "border-b-2 border-[var(--color-brand-500)] text-[var(--color-brand-400)]"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === "field" && <FieldConfigContent field={field} updateField={updateField} />}
        {activeTab === "branding" && formId && <BrandingPanel formId={formId} />}
        {activeTab === "branding" && !formId && (
          <div className="flex h-full items-center justify-center p-6 text-center">
            <p className="text-sm text-[var(--text-tertiary)]">Save your form first to configure branding.</p>
          </div>
        )}
        {activeTab === "access" && formId && <AccessPanel formId={formId} />}
        {activeTab === "access" && !formId && (
          <div className="flex h-full items-center justify-center p-6 text-center">
            <p className="text-sm text-[var(--text-tertiary)]">Save your form first to configure access.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Field configuration content (extracted from old ConfigPanel) ───────────────

interface FieldConfigContentProps {
  field: FormField | undefined;
  updateField: (fieldId: string, updates: Partial<FormField>) => void;
}

function FieldConfigContent({ field, updateField }: FieldConfigContentProps) {
  if (!field) {
    return <FormSettingsContent />;
  }

  const f = field;
  const hasOptions = ["select", "multiselect", "radio"].includes(f.type);
  const hasFileConfig = f.type === "file";
  const hasMinMax = ["number", "rating", "scale"].includes(f.type);

  function updateValidation(updates: Record<string, unknown>) {
    updateField(f.id, { validation: { ...f.validation, ...updates } as typeof f.validation });
  }

  function updateOption(index: number, key: "label" | "value", value: string) {
    const options = [...(f.options ?? [])];
    const opt = { ...options[index] };
    if (opt) {
      opt[key] = value as string;
      options[index] = opt as { label: string; value: string };
    }
    updateField(f.id, { options });
  }

  function addOption() {
    const n = (f.options?.length ?? 0) + 1;
    updateField(f.id, {
      options: [...(f.options ?? []), { label: `Option ${n}`, value: `option_${n}` }],
    });
  }

  function removeOption(index: number) {
    updateField(f.id, { options: f.options?.filter((_, i) => i !== index) });
  }

  return (
    <div className="p-4 space-y-5 overflow-y-auto flex-1">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)] mb-3">
          Field Config ·{" "}
          <span className="text-[var(--color-brand-400)] capitalize">{f.type}</span>
        </p>
      </div>

      <Input
        label="Label"
        required
        value={f.label}
        onChange={(e) => updateField(f.id, { label: e.target.value })}
      />
      <Input
        label="Placeholder"
        value={f.placeholder ?? ""}
        onChange={(e) => updateField(f.id, { placeholder: e.target.value })}
      />
      <Input
        label="Help text"
        value={f.helpText ?? ""}
        onChange={(e) => updateField(f.id, { helpText: e.target.value })}
      />

      <Switch
        id={`field-required-${f.id}`}
        checked={f.validation?.required ?? false}
        onChange={(v) => updateValidation({ required: v })}
        label="Required"
      />

      {(f.type === "text" || f.type === "textarea") && (
        <div className="grid grid-cols-2 gap-2">
          <Input
            label="Min length"
            type="number"
            value={f.validation?.minLength ?? ""}
            onChange={(e) =>
              updateValidation({
                minLength: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
          <Input
            label="Max length"
            type="number"
            value={f.validation?.maxLength ?? ""}
            onChange={(e) =>
              updateValidation({
                maxLength: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
        </div>
      )}

      {hasMinMax && (
        <div className="grid grid-cols-2 gap-2">
          <Input
            label="Min"
            type="number"
            value={f.validation?.min ?? ""}
            onChange={(e) =>
              updateValidation({ min: e.target.value ? Number(e.target.value) : undefined })
            }
          />
          <Input
            label="Max"
            type="number"
            value={f.validation?.max ?? ""}
            onChange={(e) =>
              updateValidation({ max: e.target.value ? Number(e.target.value) : undefined })
            }
          />
        </div>
      )}

      {hasOptions && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-[var(--text-secondary)]">Options</p>
          {(f.options ?? []).map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={opt.label}
                onChange={(e) => updateOption(i, "label", e.target.value)}
                placeholder="Label"
                className="flex-1 h-8 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2 text-xs text-[var(--text-primary)] focus:border-[var(--color-brand-500)] focus:outline-none"
              />
              <button
                onClick={() => removeOption(i)}
                className="text-[var(--text-tertiary)] hover:text-[var(--color-error)] transition-colors p-1"
                aria-label="Remove option"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={addOption}
            className="text-xs text-[var(--color-brand-400)] hover:text-[var(--color-brand-300)] transition-colors"
          >
            + Add option
          </button>
        </div>
      )}

      {hasFileConfig && (
        <div className="space-y-3">
          <Input
            label="Allowed types (comma-separated)"
            placeholder="image/*, video/mp4"
            value={f.validation?.allowedFileTypes?.join(", ") ?? ""}
            onChange={(e) =>
              updateValidation({
                allowedFileTypes: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
          <Input
            label="Max file size (MB)"
            type="number"
            min={1}
            max={100}
            value={f.validation?.maxFileSize ? Math.round(f.validation.maxFileSize / 1024 / 1024) : ""}
            onChange={(e) =>
              updateValidation({
                maxFileSize: e.target.value
                  ? Math.min(100, Math.max(1, Number(e.target.value))) * 1024 * 1024
                  : undefined,
              })
            }
          />
        </div>
      )}
    </div>
  );
}

// ── Form settings content ───────────────────────────────────────────────────

function FormSettingsContent() {
  const { settings, updateSettings } = useBuilderStore();

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      <div>
        <h3 className="text-sm font-medium text-[var(--text-primary)]">Form Settings</h3>
        <p className="text-xs text-[var(--text-tertiary)]">Configure global form properties</p>
      </div>

      <Input
        label="Form Title"
        value={settings.title}
        onChange={(e) => updateSettings({ title: e.target.value })}
      />

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[var(--text-primary)]">Description</label>
        <textarea
          value={settings.description}
          onChange={(e) => updateSettings({ description: e.target.value })}
          className="w-full rounded-lg border px-3 py-2 text-sm bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border-default)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20"
          rows={3}
        />
      </div>

      <div className="space-y-3 pt-4 border-t border-[var(--border-default)]">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--text-primary)]">Submission Identity</label>
          <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
            Determine if users need to connect their Sui wallet to submit. 
            <strong> Required Connected</strong> enables Gas Sponsorship for submitters.
          </p>
          <div className="grid gap-2">
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
    </div>
  );
}

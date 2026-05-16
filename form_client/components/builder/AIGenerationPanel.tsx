"use client";
import { useState } from "react";
import { X, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "../ui/Button";
import { useBuilderStore } from "../../store/builder";
import { generateSchema } from "../../lib/api/ai";
import { FormSchemaDefinition } from "../../shared/schemas/form-schema";
import { toast } from "sonner";
import { cn } from "../../lib/utils";

interface AIGenerationPanelProps {
  open: boolean;
  onClose: () => void;
}

export function AIGenerationPanel({ open, onClose }: AIGenerationPanelProps) {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const { initFromSchema, formId } = useBuilderStore();

  async function handleGenerate() {
    if (description.trim().length < 10) {
      toast.error("Please describe your form in at least 10 characters");
      return;
    }
    setLoading(true);
    setGenerated(false);
    try {
      const raw = await generateSchema(description);
      const parsed = FormSchemaDefinition.safeParse(raw);
      if (!parsed.success) {
        toast.error("Generated schema was invalid. Please try again.");
        return;
      }
      // Progressive animation: add fields one by one with a small delay
      const schema = parsed.data;
      initFromSchema({ ...schema, fields: [] }, formId ?? "");
      for (let i = 0; i < schema.fields.length; i++) {
        const field = schema.fields[i];
        if (!field) continue;
        await new Promise((r) => setTimeout(r, 120));
        useBuilderStore.getState().addField(field.type);
        // Update label for the last added field
        const newFields = useBuilderStore.getState().fields;
        const lastField = newFields[newFields.length - 1];
        if (lastField) {
          useBuilderStore.getState().updateField(lastField.id, {
            label: field.label,
            placeholder: field.placeholder,
            helpText: field.helpText,
            validation: field.validation,
            options: field.options,
          });
        }
      }
      setGenerated(true);
      toast.success(`Generated ${schema.fields.length} fields`);
      
      // Auto-close after a short delay so the user can see the generated fields
      setTimeout(() => {
        onClose();
        setGenerated(false);
        setDescription("");
      }, 1500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden
      />
      {/* Panel */}
      <div
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-full max-w-md border-l shadow-[var(--shadow-xl)] flex flex-col",
          "bg-[var(--bg-elevated)] border-[var(--border-default)]",
          "transition-transform duration-[var(--duration-slow)] ease-[var(--ease-out)]",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-default)] px-5 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[var(--color-brand-400)]" />
            <h2 className="font-semibold text-[var(--text-primary)]">AI Form Generator</h2>
          </div>
          <button onClick={onClose} aria-label="Close AI panel" className="rounded-lg p-1.5 text-[var(--text-tertiary)] hover:bg-[var(--bg-muted)] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Describe what information you want to collect. Be specific about field types, required responses, and any special requirements.
          </p>
          <div className="space-y-1.5">
            <label htmlFor="ai-description" className="block text-sm font-medium text-[var(--text-primary)]">
              Form description
            </label>
            <textarea
              id="ai-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. A customer feedback form that collects name, email, star rating (1-5), what they liked and disliked, and whether they'd recommend us. Make the rating required."
              rows={6}
              className="w-full rounded-lg border px-3 py-2 text-sm resize-none bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border-default)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20 transition-colors"
            />
            <p className="text-xs text-[var(--text-tertiary)]">{description.length}/2000 characters</p>
          </div>

          {generated && (
            <div className="flex items-center gap-2 rounded-lg bg-[var(--color-success-bg)] px-3 py-2 text-sm text-[var(--color-success)]">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Schema applied to canvas. Review and edit as needed.
            </div>
          )}
        </div>

        <div className="border-t border-[var(--border-default)] p-4 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            className="flex-1"
            loading={loading}
            onClick={handleGenerate}
            disabled={description.trim().length < 10}
          >
            {loading ? "Generating..." : "Generate form"}
          </Button>
        </div>
      </div>
    </>
  );
}

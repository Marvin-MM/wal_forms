"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Save, Eye, History } from "lucide-react";
import { Button } from "../ui/Button";
import { useBuilderStore } from "../../store/builder";
import { createForm, updateForm } from "../../lib/api/forms";
import { toast } from "sonner";
import { SuiExplorerLink } from "../common/ExplorerLinks";
import { CopyButton } from "../common/CopyButton";
import { env } from "../../lib/env";

interface BuilderToolbarProps {
  formId?: string;
  onAIClick: () => void;
}

export function BuilderToolbar({ formId, onAIClick }: BuilderToolbarProps) {
  const { getSchema, settings, isDirty, setDirty, formId: storeFormId } = useBuilderStore();
  const [publishing, setPublishing] = useState(false);
  const [publishedForm, setPublishedForm] = useState<{ id: string; suiObjectId?: string | null } | null>(null);
  const router = useRouter();

  const activeFormId = formId ?? storeFormId;

  async function handlePublish() {
    const schema = getSchema();
    if (!schema.title.trim()) { toast.error("Form name is required"); return; }
    if (schema.fields.length === 0) { toast.error("Add at least one field"); return; }

    setPublishing(true);
    try {
      const result = activeFormId
        ? await updateForm(activeFormId, {
            schema,
            isPrivate: settings.isPrivate,
            submissionIdentityMode: schema.settings?.submissionIdentityMode || settings.submissionIdentityMode,
          })
        : await createForm({ 
            schema, 
            isPrivate: settings.isPrivate,
            submissionIdentityMode: schema.settings?.submissionIdentityMode || "anonymous" 
          });

      setPublishedForm({ id: result.id, suiObjectId: result.suiObjectId });
      setDirty(false);

      if (!activeFormId) {
        toast.success("Form published!");
        router.replace(`/builder/${result.id}`);
      } else {
        toast.success("Form updated!");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  }

  const shareUrl = publishedForm
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/f/${publishedForm.id}`
    : activeFormId
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/f/${activeFormId}`
    : null;

  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-2">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onAIClick}>
          <Sparkles className="h-4 w-4 text-[var(--color-brand-400)]" />
          AI Generate
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {shareUrl && (
          <CopyButton value={shareUrl} label="Copy link" size="sm" />
        )}
        {publishedForm?.suiObjectId && (
          <SuiExplorerLink objectId={publishedForm.suiObjectId} label="View on Sui" />
        )}
        {activeFormId && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(`/f/${activeFormId}`, "_blank")}
          >
            <Eye className="h-4 w-4" />
            Preview
          </Button>
        )}
        <Button
          variant="primary"
          size="sm"
          loading={publishing}
          onClick={handlePublish}
          disabled={!isDirty && !!activeFormId}
        >
          <Save className="h-4 w-4" />
          {activeFormId ? "Save changes" : "Publish form"}
        </Button>
      </div>
    </div>
  );
}

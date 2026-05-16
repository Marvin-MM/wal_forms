"use client";
import { useState, useCallback, useRef } from "react";
import { Loader2, Check, X, ExternalLink, Image as ImageIcon } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getFormBranding, upsertFormBranding } from "../../lib/api/branding";
import { queryKeys } from "../../lib/query-keys";
import { Input } from "../ui/Input";
import { Switch } from "../ui/Select";
import { cn, walrusBlobUrl } from "../../lib/utils";
import { useTusUpload } from "../../hooks/useTusUpload";
import type { FormBranding } from "../../shared/types/entities";

const FONT_OPTIONS = [
  { value: "Inter", label: "Inter (Default)" },
  { value: "Roboto", label: "Roboto" },
  { value: "Outfit", label: "Outfit" },
  { value: "Space Grotesk", label: "Space Grotesk" },
  { value: "DM Sans", label: "DM Sans" },
];

const LOGO_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const LOGO_MAX_SIZE = 2 * 1024 * 1024;

function AccordionSection({ title, children, defaultOpen = false }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[var(--border-subtle)] last:border-0">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
        aria-expanded={open}>
        {title}
        <span className={cn("transition-transform duration-200 text-[var(--text-tertiary)]", open ? "rotate-180" : "")}>▾</span>
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

function HexColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const valid = /^#[0-9A-Fa-f]{6}$/.test(value);
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-[var(--text-secondary)]">{label}</label>
      <div className="flex items-center gap-2">
        <div className="relative h-8 w-8 rounded-lg border border-[var(--border-default)] overflow-hidden shrink-0">
          <input type="color" value={valid ? value : "#6366f1"} onChange={e => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer" aria-label={label} />
        </div>
        <input type="text" value={value} onChange={e => onChange(e.target.value)}
          placeholder="#6366f1" maxLength={7}
          className={cn("flex-1 h-8 rounded-lg border px-2 text-xs font-mono bg-[var(--bg-elevated)] text-[var(--text-primary)] focus:outline-none",
            valid ? "border-[var(--border-default)] focus:border-[var(--color-brand-500)]"
                  : "border-[var(--color-error)]")} />
      </div>
    </div>
  );
}

interface BrandingPanelProps { formId: string; }

type SaveInput = Parameters<typeof upsertFormBranding>[1];

export function BrandingPanel({ formId }: BrandingPanelProps) {
  const { data: initialBranding, isLoading } = useQuery({
    queryKey: queryKeys.branding.detail(formId),
    queryFn: () => getFormBranding(formId),
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-[var(--text-tertiary)]">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading branding...
      </div>
    );
  }

  return (
    <BrandingPanelEditor
      key={initialBranding?.updatedAt ?? "empty"}
      formId={formId}
      initialBranding={initialBranding}
    />
  );
}

function BrandingPanelEditor({ formId, initialBranding }: BrandingPanelProps & { initialBranding?: FormBranding | null }) {
  const qc = useQueryClient();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const { upload, status: uploadStatus, progress: uploadPct } = useTusUpload(formId);

  const [accentColor, setAccentColor] = useState(initialBranding?.accentColor ?? "#6366f1");
  const [bgColor, setBgColor] = useState(initialBranding?.backgroundColor ?? "");
  const [fontFamily, setFontFamily] = useState(initialBranding?.fontFamily ?? "Inter");
  const [submitText, setSubmitText] = useState(initialBranding?.submitButtonText ?? "Submit");
  const [thankYou, setThankYou] = useState(initialBranding?.thankYouMessage ?? "Thank you for your submission!");
  const [showBranding, setShowBranding] = useState(initialBranding?.showWalrusFormsBranding ?? true);
  const [logoBlob, setLogoBlob] = useState<string | null>(initialBranding?.logoWalrusBlobId ?? null);
  const uploading = uploadStatus === "requesting" || uploadStatus === "uploading" || uploadStatus === "confirming";

  const { mutate: save } = useMutation({
    mutationFn: (data: SaveInput) => upsertFormBranding(formId, data),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.branding.detail(formId), data);
      setSaveStatus("saved");
      timer.current = setTimeout(() => setSaveStatus("idle"), 2500);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to save branding");
      setSaveStatus("idle"); 
    },
  });

  const triggerSave = useCallback((overrides: Partial<SaveInput> = {}) => {
    if (timer.current) clearTimeout(timer.current);
    setSaveStatus("saving");
    save({
      accentColor: accentColor || null,
      backgroundColor: bgColor || null,
      fontFamily,
      submitButtonText: submitText,
      thankYouMessage: thankYou,
      showWalrusFormsBranding: showBranding,
      logoWalrusBlobId: logoBlob,
      ...overrides,
    });
  }, [accentColor, bgColor, fontFamily, submitText, thankYou, showBranding, logoBlob, save]);

  const uploadFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (!LOGO_MIME_TYPES.includes(file.type)) { toast.error("Logo must be PNG, JPEG, WEBP, or SVG"); return; }
    if (file.size > LOGO_MAX_SIZE) { toast.error("Image must be under 2MB"); return; }
    try {
      const blobId = await upload(file, {
        allowedMimeTypes: LOGO_MIME_TYPES,
        maxFileSize: LOGO_MAX_SIZE,
        uploadPurpose: "branding_logo",
      });
      setLogoBlob(blobId);
      triggerSave({ logoWalrusBlobId: blobId });
      toast.success("Logo uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Logo upload failed");
    }
  }, [triggerSave, upload]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void uploadFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void uploadFile(file);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Save indicator */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] shrink-0">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">Branding</p>
        <div className="flex items-center gap-1.5 text-xs">
          {saveStatus === "saving" && <><Loader2 className="h-3 w-3 animate-spin text-[var(--text-tertiary)]" /><span className="text-[var(--text-tertiary)]">Saving...</span></>}
          {saveStatus === "saved" && <><Check className="h-3 w-3 text-[var(--color-success)]" /><span className="text-[var(--color-success)]">Saved</span></>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Logo */}
        <AccordionSection title="Logo" defaultOpen>
          {logoBlob ? (
            <div className="flex items-center gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] p-3">
              <img
                src={walrusBlobUrl(logoBlob)}
                alt="Logo" className="h-10 w-10 object-contain rounded"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono text-[var(--text-tertiary)] truncate">{logoBlob.slice(0, 20)}…</p>
                <a href={walrusBlobUrl(logoBlob)}
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs text-[var(--color-brand-400)] hover:underline flex items-center gap-1 mt-0.5">
                  View on Walrus <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <button type="button"
                onClick={() => { setLogoBlob(null); triggerSave({ logoWalrusBlobId: null }); }}
                className="text-[var(--text-tertiary)] hover:text-[var(--color-error)] transition-colors"
                aria-label="Remove logo">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div
              onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === "Enter" && fileInputRef.current?.click()}
              aria-label="Upload logo"
              className={cn(
                "flex flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors",
                isDragOver
                  ? "border-[var(--color-brand-500)] bg-[var(--color-brand-500)]/5"
                  : "border-[var(--border-default)] hover:border-[var(--border-strong)]"
              )}
            >
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleFileChange} className="sr-only" aria-hidden />
              {uploading ? (
                <div className="w-full space-y-2 text-center">
                  <Loader2 className="h-5 w-5 animate-spin text-[var(--color-brand-400)] mx-auto" />
                  <div className="w-full rounded-full bg-[var(--bg-subtle)] h-1">
                    <div className="h-1 rounded-full bg-[var(--color-brand-500)] transition-all" style={{ width: `${uploadPct}%` }} />
                  </div>
                </div>
              ) : (
                <>
                  <ImageIcon className="h-5 w-5 text-[var(--text-tertiary)]" />
                  <p className="text-xs text-[var(--text-secondary)] text-center">
                    Drag & drop or click to upload<br />
                    <span className="text-[var(--text-tertiary)]">PNG, JPEG, WEBP, SVG · max 2MB</span>
                  </p>
                </>
              )}
            </div>
          )}
        </AccordionSection>

        {/* Colors */}
        <AccordionSection title="Colors" defaultOpen>
          <HexColorInput label="Accent color" value={accentColor}
            onChange={v => { setAccentColor(v); if (/^#[0-9A-Fa-f]{6}$/.test(v)) triggerSave({ accentColor: v }); }} />
          <HexColorInput label="Background color" value={bgColor}
            onChange={v => { setBgColor(v); if (/^#[0-9A-Fa-f]{6}$/.test(v) || v === "") triggerSave({ backgroundColor: v || null }); }} />
        </AccordionSection>

        {/* Typography */}
        <AccordionSection title="Typography">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[var(--text-secondary)]">Font family</label>
            <select value={fontFamily}
              onChange={e => { setFontFamily(e.target.value); triggerSave({ fontFamily: e.target.value }); }}
              className="h-8 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2 text-xs text-[var(--text-primary)] focus:outline-none">
              {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
            <p className="mt-2 text-sm p-2 rounded bg-[var(--bg-subtle)] text-[var(--text-secondary)]" style={{ fontFamily }}>
              The quick brown fox jumps over the lazy dog.
            </p>
          </div>
        </AccordionSection>

        {/* Content */}
        <AccordionSection title="Content">
          <Input label={`Submit button text (${submitText.length}/50)`} value={submitText}
            onChange={e => setSubmitText(e.target.value.slice(0, 50))}
            onBlur={() => triggerSave({ submitButtonText: submitText })} />
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[var(--text-secondary)]">
              Thank-you message ({thankYou.length}/500)
            </label>
            <textarea value={thankYou}
              onChange={e => setThankYou(e.target.value.slice(0, 500))}
              onBlur={() => triggerSave({ thankYouMessage: thankYou })} rows={3}
              className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2 text-xs text-[var(--text-primary)] resize-none focus:outline-none focus:border-[var(--color-brand-500)]" />
          </div>
          <Switch id="show-branding" label="Show 'Powered by WalrusForms'" checked={showBranding}
            onChange={v => { setShowBranding(v); triggerSave({ showWalrusFormsBranding: v }); }} />
        </AccordionSection>
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";
import { Shield, ExternalLink, Trash2, Copy, CheckCircle2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { deleteMySubmission } from "../../lib/api/submissions";
import type { SubmissionReceipt } from "../../shared/types/entities";
import { cn } from "../../lib/utils";

interface SubmissionReceiptCardProps {
  receipt: SubmissionReceipt;
  onDeleted: (id: string) => void;
}

function MonoChip({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    void navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex items-center gap-1.5 group">
      {label && <span className="text-xs text-[var(--text-tertiary)] shrink-0">{label}</span>}
      <code className="text-xs font-mono text-[var(--text-secondary)] truncate max-w-[160px]">
        {value.slice(0, 10)}…{value.slice(-6)}
      </code>
      <button
        type="button"
        onClick={copy}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
        aria-label="Copy"
      >
        {copied ? (
          <CheckCircle2 className="h-3 w-3 text-[var(--color-success)]" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </button>
    </div>
  );
}

export function SubmissionReceiptCard({ receipt, onDeleted }: SubmissionReceiptCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const { mutate: requestDelete, isPending } = useMutation({
    mutationFn: () => deleteMySubmission(receipt.walrusBlobId),
    onSuccess: () => {
      toast.success("Deletion request submitted on-chain");
      onDeleted(receipt.id);
    },
    onError: () => toast.error("Deletion request failed"),
  });

  return (
    <div className={cn(
      "rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] overflow-hidden transition-all",
      showDeleteConfirm && "ring-2 ring-[var(--color-error)]/30"
    )}>
      <div className="p-4 flex flex-col sm:flex-row sm:items-start gap-4">
        {/* Left: metadata */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            {receipt.isAnonymous && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-muted)] px-2 py-0.5 text-xs text-[var(--text-tertiary)]">
                Anonymous
              </span>
            )}
            {receipt.isSponsored && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-400">
                Sponsored
              </span>
            )}
            {receipt.isEncrypted && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-brand-500)]/10 px-2 py-0.5 text-xs text-[var(--color-brand-400)]">
                <Shield className="h-3 w-3" /> Encrypted
              </span>
            )}
          </div>

          <p className="text-xs text-[var(--text-tertiary)]">
            Submitted {formatDistanceToNow(new Date(receipt.createdAt), { addSuffix: true })}
          </p>

          <div className="space-y-1">
            <MonoChip value={receipt.walrusBlobId} label="Blob:" />
            {receipt.suiObjectId && (
              <MonoChip value={receipt.suiObjectId} label="Object:" />
            )}
            <div className="text-xs text-[var(--text-tertiary)]">
              Schema v{receipt.schemaVersion}
            </div>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex flex-col gap-2 shrink-0">
          {receipt.suiObjectId && (
            <>
              <a
                href={`/verify/${receipt.suiObjectId}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors"
              >
                <Shield className="h-3.5 w-3.5" />
                View proof
                <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href={`https://suiscan.xyz/testnet/object/${receipt.suiObjectId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors"
              >
                Sui Explorer
                <ExternalLink className="h-3 w-3" />
              </a>
            </>
          )}
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-error)]/30 px-3 py-1.5 text-xs font-medium text-[var(--color-error)] hover:bg-[var(--color-error-bg)] transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Request deletion
          </button>
        </div>
      </div>

      {/* Delete confirmation inline */}
      {showDeleteConfirm && (
        <div className="border-t border-[var(--color-error)]/20 bg-[var(--color-error-bg)] p-4 space-y-3">
          <p className="text-sm font-semibold text-[var(--color-error)]">Confirm deletion request</p>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            The on-chain record is <strong>permanent and cannot be deleted</strong>. This request will suppress
            the submission from the admin&apos;s dashboard and stop serving the content blob. This action is
            recorded on-chain.
          </p>
          <div className="space-y-2">
            <p className="text-xs text-[var(--text-tertiary)]">Type <strong>DELETE</strong> to confirm:</p>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="h-8 w-full rounded-lg border border-[var(--color-error)]/30 bg-[var(--bg-elevated)] px-2 text-xs focus:outline-none focus:border-[var(--color-error)]"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setShowDeleteConfirm(false); setConfirmText(""); }}
              className="flex-1 h-8 rounded-lg border border-[var(--border-default)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={confirmText !== "DELETE" || isPending}
              onClick={() => requestDelete()}
              className="flex-1 h-8 rounded-lg bg-[var(--color-error)] text-xs font-medium text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              {isPending ? "Submitting…" : "Confirm deletion"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

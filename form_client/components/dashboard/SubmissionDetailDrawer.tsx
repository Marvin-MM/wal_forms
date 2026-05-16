"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield, Lock, ExternalLink, Edit3, Save } from "lucide-react";
import type { Form, Submission } from "../../shared/types/entities";
import type { SubmissionPriority } from "../../shared/types/entities";
import { Drawer } from "../ui/Drawer";
import { PriorityBadge, Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";
import { WalletAddress } from "../common/CopyButton";
import { SuiExplorerLink, WalrusLink } from "../common/ExplorerLinks";
import { fetchBlobAsJson } from "../../lib/walrus";
import { decryptSubmission } from "../../lib/seal";
import { getSealConfig } from "../../lib/api/misc";
import { queryKeys } from "../../lib/query-keys";
import { formatDate } from "../../lib/utils";
import { useSignTransaction, useCurrentAccount } from "@mysten/dapp-kit";
import { toast } from "sonner";

interface SubmissionDetailDrawerProps {
  submission: Submission | null;
  form: Form;
  onClose: () => void;
  onUpdate: (updates: { adminNotes?: string; priority?: SubmissionPriority; isReviewed?: boolean }) => void;
}

export function SubmissionDetailDrawer({ submission, form, onClose, onUpdate }: SubmissionDetailDrawerProps) {
  const [notes, setNotes] = useState("");
  const [editingNotes, setEditingNotes] = useState(false);
  const [priority, setPriority] = useState<SubmissionPriority>(submission?.priority ?? "medium");
  const [decryptedData, setDecryptedData] = useState<Record<string, unknown> | null>(null);
  const [decrypting, setDecrypting] = useState(false);
  const { mutateAsync: signTx } = useSignTransaction();
  const currentAccount = useCurrentAccount();

  const { data: blobData, isLoading: blobLoading } = useQuery({
    queryKey: queryKeys.submissions.blob(submission?.walrusBlobId ?? ""),
    queryFn: () => fetchBlobAsJson<Record<string, unknown>>(submission!.walrusBlobId),
    enabled: !!submission && !submission.isEncrypted,
  });

  async function handleDecrypt() {
    if (!submission) return;
    setDecrypting(true);
    try {
      const sealConfig = await getSealConfig();
      const rawBytes = await fetch(
        `${process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_ENDPOINT}/v1/blobs/${submission.walrusBlobId}`
      ).then((r) => r.arrayBuffer());
      const decrypted = await decryptSubmission(
        new Uint8Array(rawBytes), 
        sealConfig, 
        currentAccount?.address ?? "",
        async (txBytes) => {
          const { Transaction } = await import("@mysten/sui/transactions");
          const tx = Transaction.from(txBytes);
          const res = await signTx({ transaction: tx });
          return { signature: res.signature, bytes: res.bytes };
        }
      );
      setDecryptedData(decrypted);
      toast.success("Decrypted successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Decryption failed");
    } finally {
      setDecrypting(false);
    }
  }

  function handleSave() {
    onUpdate({ adminNotes: notes, priority, isReviewed: true });
    setEditingNotes(false);
    toast.success("Submission updated");
  }

  const displayData = decryptedData ?? (blobData && !submission?.isEncrypted ? blobData : null);

  return (
    <Drawer
      open={!!submission}
      onClose={onClose}
      title="Submission Details"
      description={submission ? formatDate(submission.createdAt) : undefined}
    >
      {submission && (
        <div className="space-y-6">
          {/* Metadata */}
          <div className="space-y-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-subtle)] p-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">Metadata</h3>
            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">Submitter</span>
                {submission.submitterWallet
                  ? <WalletAddress address={submission.submitterWallet} />
                  : <span className="text-xs text-[var(--text-tertiary)]">Anonymous</span>
                }
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">Encrypted</span>
                <Badge variant={submission.isEncrypted ? "brand" : "default"}>
                  {submission.isEncrypted ? "Yes (Seal)" : "No"}
                </Badge>
              </div>
              {submission.walrusBlobId && (
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">Walrus blob</span>
                  <WalrusLink blobId={submission.walrusBlobId} />
                </div>
              )}
              {submission.suiObjectId && (
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">Sui receipt</span>
                  <SuiExplorerLink objectId={submission.suiObjectId} label="View" />
                </div>
              )}
            </div>
          </div>

          {/* Response data */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">Response</h3>
              {submission.isEncrypted && !decryptedData && (
                <Button variant="outline" size="sm" loading={decrypting} onClick={handleDecrypt}>
                  <Lock className="h-3.5 w-3.5" />
                  Decrypt with wallet
                </Button>
              )}
            </div>
            {blobLoading && !submission.isEncrypted && (
              <div className="animate-pulse space-y-2">
                <div className="h-4 w-3/4 rounded skeleton" />
                <div className="h-4 w-full rounded skeleton" />
              </div>
            )}
            {displayData ? (
              <div className="space-y-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4">
                {Object.entries(displayData).map(([key, val]) => (
                  <div key={key} className="grid grid-cols-[auto_1fr] gap-3">
                    <span className="text-xs font-medium text-[var(--text-tertiary)] whitespace-nowrap">{key}</span>
                    <span className="text-sm text-[var(--text-primary)] break-all">{String(val)}</span>
                  </div>
                ))}
              </div>
            ) : submission.isEncrypted && !decryptedData ? (
              <div className="flex items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--color-info-bg)] p-4 text-sm text-[var(--color-info)]">
                <Shield className="h-4 w-4 shrink-0" />
                Content is Seal-encrypted. Click "Decrypt with wallet" to view.
              </div>
            ) : null}
          </div>

          {/* Admin notes & priority */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">Admin Notes</h3>
            <Select
              options={[
                { label: "Low", value: "low" },
                { label: "Medium", value: "medium" },
                { label: "High", value: "high" },
                { label: "Urgent", value: "urgent" },
              ]}
              value={priority}
              onChange={(e) => setPriority(e.target.value as SubmissionPriority)}
              label="Priority"
            />
            {editingNotes ? (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes…"
                rows={4}
                autoFocus
                className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--color-brand-500)] focus:outline-none resize-none"
              />
            ) : (
              <button
                onClick={() => { setNotes(submission.adminNotes ?? ""); setEditingNotes(true); }}
                className="w-full rounded-lg border border-dashed border-[var(--border-strong)] px-3 py-2 text-left text-sm text-[var(--text-tertiary)] hover:border-[var(--color-brand-500)] hover:text-[var(--text-secondary)] transition-colors"
              >
                <Edit3 className="mr-2 inline h-3.5 w-3.5" />
                {submission.adminNotes ?? "Click to add notes…"}
              </button>
            )}
            <Button variant="primary" size="sm" onClick={handleSave} className="w-full">
              <Save className="h-4 w-4" />
              Save changes
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  );
}

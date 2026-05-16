"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { listAdmins, addAdmin, removeAdmin } from "../../lib/api/admins";
import { queryKeys } from "../../lib/query-keys";
import { AuthGuard } from "../layout/AuthGuard";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { WalletAddress } from "../common/CopyButton";
import { ConfirmDialog } from "../ui/Dialog";
import { SkeletonCard } from "../ui/Skeleton";
import { formatDate } from "../../lib/utils";
import { toast } from "sonner";
import type { Admin } from "../../shared/types/entities";

interface AdminManagementProps {
  formId: string;
  formTitle: string;
}

export function AdminManagement({ formId, formTitle }: AdminManagementProps) {
  const qc = useQueryClient();
  const [newWallet, setNewWallet] = useState("");
  const [walletError, setWalletError] = useState("");
  const [removeTarget, setRemoveTarget] = useState<Admin | null>(null);

  const { data: admins = [], isLoading } = useQuery({
    queryKey: queryKeys.admins.list(formId),
    queryFn: () => listAdmins(formId),
  });

  const { mutate: addMutate, isPending: isAdding } = useMutation({
    mutationFn: () => addAdmin(formId, newWallet.trim()),
    onSuccess: () => {
      toast.success("Admin added");
      setNewWallet("");
      void qc.invalidateQueries({ queryKey: queryKeys.admins.list(formId) });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to add admin"),
  });

  const { mutate: removeMutate, isPending: isRemoving } = useMutation({
    mutationFn: (wallet: string) => removeAdmin(formId, wallet),
    onSuccess: () => {
      toast.success("Admin removed");
      setRemoveTarget(null);
      void qc.invalidateQueries({ queryKey: queryKeys.admins.list(formId) });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to remove admin"),
  });

  function handleAdd() {
    if (!newWallet.trim().startsWith("0x")) {
      setWalletError("Enter a valid Sui wallet address starting with 0x");
      return;
    }
    setWalletError("");
    addMutate();
  }

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div>
          <Link href={`/dashboard/${formId}`} className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Admin Management</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{formTitle}</p>
        </div>

        {/* Add admin */}
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-5">
          <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Add Admin</h2>
          <div className="flex gap-2">
            <Input
              className="flex-1"
              placeholder="0x... Sui wallet address"
              value={newWallet}
              onChange={(e) => { setNewWallet(e.target.value); setWalletError(""); }}
              error={walletError}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <Button variant="primary" onClick={handleAdd} loading={isAdding}>
              <UserPlus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </div>

        {/* Admin list */}
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)]">
          <div className="border-b border-[var(--border-default)] px-5 py-3">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Admins ({admins.length})
            </h2>
          </div>
          {isLoading ? (
            <div className="p-4"><SkeletonCard /></div>
          ) : admins.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-[var(--text-tertiary)]">No admins added yet.</p>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {admins.map((admin) => (
                <div key={admin.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div>
                    <WalletAddress address={admin.walletAddress} chars={8} />
                    <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">Added {formatDate(admin.createdAt)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRemoveTarget(admin)}
                    className="text-[var(--color-error)] hover:bg-[var(--color-error-bg)]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => removeTarget && removeMutate(removeTarget.walletAddress)}
        title="Remove admin?"
        description={`${removeTarget?.walletAddress} will lose access to this form's dashboard.`}
        confirmLabel="Remove"
        loading={isRemoving}
      />
    </AuthGuard>
  );
}

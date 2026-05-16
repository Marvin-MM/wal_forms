"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield, Inbox } from "lucide-react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { AuthGuard } from "../../../components/layout/AuthGuard";
import { Header } from "../../../components/layout/Header";
import { SubmissionReceiptCard } from "../../../components/me/SubmissionReceiptCard";
import { listMySubmissions } from "../../../lib/api/submissions";
import { queryKeys } from "../../../lib/query-keys";
import type { SubmissionReceipt } from "../../../shared/types/entities";

interface ReceiptGroup {
  formTitle: string;
  formDescription: string | null;
  receipts: SubmissionReceipt[];
}

function MySubmissionsContent() {
  const currentAccount = useCurrentAccount();
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  const { data: receipts = [], isLoading } = useQuery({
    queryKey: queryKeys.mySubmissions(),
    queryFn: listMySubmissions,
    enabled: !!currentAccount,
  });

  const visible = receipts.filter((r) => !deletedIds.has(r.id));

  // Group by form
  const grouped = visible.reduce<Record<string, ReceiptGroup>>((acc, r) => {
    if (!acc[r.formId]) {
      acc[r.formId] = { formTitle: r.formTitle, formDescription: r.formDescription, receipts: [] };
    }
    acc[r.formId]!.receipts.push(r);
    return acc;
  }, {});

  function handleDeleted(id: string) {
    setDeletedIds((prev) => new Set([...prev, id]));
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-6 w-6 rounded-full border-2 border-[var(--color-brand-500)] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center space-y-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-default)]">
          <Inbox className="h-8 w-8 text-[var(--text-tertiary)]" />
        </div>
        <div>
          <p className="text-lg font-semibold text-[var(--text-primary)]">No submissions yet</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)] max-w-sm">
            Submissions from wallet-connected form responses appear here.
            Submit a form with your wallet connected to see your receipt.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {Object.entries(grouped).map(([formId, group]) => (
        <section key={formId} className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">{group.formTitle}</h2>
            {group.formDescription && (
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">{group.formDescription}</p>
            )}
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              {group.receipts.length} submission{group.receipts.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="space-y-3">
            {group.receipts.map((receipt) => (
              <SubmissionReceiptCard
                key={receipt.id}
                receipt={receipt}
                onDeleted={handleDeleted}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function MySubmissionsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        {/* Page header */}
        <div className="mb-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-brand-500)]/10">
            <Shield className="h-5 w-5 text-[var(--color-brand-400)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              My Submissions
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Your wallet-connected submission receipts, verifiable on-chain.
            </p>
          </div>
        </div>

        <AuthGuard>
          <MySubmissionsContent />
        </AuthGuard>
      </main>
    </div>
  );
}

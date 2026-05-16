"use client";
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Check, Plus, X, Upload } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import Papa from "papaparse";
import { getAccessPolicy, upsertAccessPolicy, listAllowlist, addAllowlistEntry, removeAllowlistEntry } from "../../lib/api/access";
import { queryKeys } from "../../lib/query-keys";
import { Input } from "../ui/Input";
import { Switch } from "../ui/Select";
import type { AccessPolicy } from "../../shared/types/entities";

interface AccessPanelProps { formId: string; }

export function AccessPanel({ formId }: AccessPanelProps) {
  const qc = useQueryClient();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [newAddress, setNewAddress] = useState("");
  const [passwordMode, setPasswordMode] = useState<"unset" | "set" | "changing">("unset");
  const [passwordValue, setPasswordValue] = useState("");

  const { data: policy } = useQuery({
    queryKey: queryKeys.access.policy(formId),
    queryFn: () => getAccessPolicy(formId),
  });

  const { data: allowlistData } = useQuery({
    queryKey: queryKeys.access.allowlist(formId),
    queryFn: () => listAllowlist(formId),
    enabled: !!(policy?.requiresAllowlist),
  });

  const { mutate: savePolicy } = useMutation({
    mutationFn: (input: Parameters<typeof upsertAccessPolicy>[1]) => upsertAccessPolicy(formId, input),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.access.policy(formId), data);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
    },
    onError: () => { toast.error("Failed to save access policy"); setSaveStatus("idle"); },
  });

  const { mutate: addEntry } = useMutation({
    mutationFn: (wallet: string) => addAllowlistEntry(formId, wallet),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: queryKeys.access.allowlist(formId) }); setNewAddress(""); },
    onError: () => toast.error("Failed to add address"),
  });

  const { mutate: removeEntry } = useMutation({
    mutationFn: (wallet: string) => removeAllowlistEntry(formId, wallet),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.access.allowlist(formId) }),
    onError: () => toast.error("Failed to remove address"),
  });

  const triggerSave = useCallback((overrides: Partial<AccessPolicy> & { clearPassword?: boolean; password?: string }) => {
    setSaveStatus("saving");
    const current = policy || {} as Partial<AccessPolicy>;
    const merged = {
      requiresAllowlist: overrides.requiresAllowlist !== undefined ? overrides.requiresAllowlist : (current.requiresAllowlist ?? false),
      hasResponseLimit: overrides.hasResponseLimit !== undefined ? overrides.hasResponseLimit : (current.hasResponseLimit ?? false),
      responseLimit: overrides.responseLimit !== undefined ? overrides.responseLimit : (current.responseLimit ?? null),
      opensAt: overrides.opensAt !== undefined ? overrides.opensAt : (current.opensAt ?? null),
      closesAt: overrides.closesAt !== undefined ? overrides.closesAt : (current.closesAt ?? null),
      password: overrides.password,
      clearPassword: overrides.clearPassword,
    };
    savePolicy(merged);
  }, [savePolicy, policy]);

  function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    Papa.parse(file, {
      complete: (results) => {
        const addresses = (results.data as string[][]).flat().map(s => s.trim()).filter(s => s.startsWith("0x"));
        addresses.forEach(addr => addEntry(addr));
        toast.success(`Imported ${addresses.length} addresses`);
      },
      error: () => toast.error("Failed to parse CSV"),
    });
    e.target.value = "";
  }

  const p = policy as AccessPolicy | null | undefined;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">Access Control</p>
        <div className="flex items-center gap-1.5 text-xs">
          {saveStatus === "saving" && <><Loader2 className="h-3 w-3 animate-spin text-[var(--text-tertiary)]" /><span className="text-[var(--text-tertiary)]">Saving...</span></>}
          {saveStatus === "saved" && <><Check className="h-3 w-3 text-[var(--color-success)]" /><span className="text-[var(--color-success)]">Saved</span></>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Submission Window */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Submission Window</h3>
          <div className="grid grid-cols-1 gap-2">
            <Input
              label="Opens at"
              type="datetime-local"
              value={p?.opensAt ? new Date(p.opensAt).toISOString().slice(0, 16) : ""}
              onChange={e => triggerSave({ opensAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
            />
            <Input
              label="Closes at"
              type="datetime-local"
              value={p?.closesAt ? new Date(p.closesAt).toISOString().slice(0, 16) : ""}
              onChange={e => triggerSave({ closesAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
            />
          </div>
          <p className="text-xs text-[var(--text-tertiary)]">
            {p?.opensAt && p?.closesAt
              ? `Form accepts submissions from ${new Date(p.opensAt).toLocaleDateString()} to ${new Date(p.closesAt).toLocaleDateString()}`
              : p?.opensAt
              ? `Opens ${formatDistanceToNow(new Date(p.opensAt), { addSuffix: true })}`
              : p?.closesAt
              ? `Closes ${formatDistanceToNow(new Date(p.closesAt), { addSuffix: true })}`
              : "Form is always open"}
          </p>
        </section>

        {/* Response Limit */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Response Limit</h3>
          <Switch
            id="max-responses-toggle"
            label="Enable response limit"
            checked={!!p?.hasResponseLimit}
            onChange={v => triggerSave({ hasResponseLimit: v, responseLimit: v ? (p?.responseLimit || 100) : null })}
          />
          {p?.hasResponseLimit && (
            <>
              <Input
                label="Maximum responses"
                type="number"
                value={p.responseLimit || ""}
                onChange={e => triggerSave({ responseLimit: Number(e.target.value) || null })}
              />
              <p className="text-xs text-[var(--text-tertiary)]">
                {p.currentResponseCount ?? 0} of {p.responseLimit || "∞"} responses received
              </p>
            </>
          )}
        </section>

        {/* Password Protection */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Password Protection</h3>
          <Switch
            id="password-toggle"
            label="Enable password protection"
            checked={!!p?.hasPassword || passwordMode !== "unset"}
            onChange={v => {
              if (!v) { triggerSave({ clearPassword: true }); setPasswordMode("unset"); }
              else setPasswordMode("changing");
            }}
          />
          {(p?.hasPassword && passwordMode === "unset") && (
            <div className="flex items-center justify-between rounded-lg bg-[var(--bg-subtle)] px-3 py-2 text-sm">
              <span className="text-[var(--text-secondary)]">Password is set</span>
              <button type="button" onClick={() => setPasswordMode("changing")} className="text-xs text-[var(--color-brand-400)] hover:underline">Change</button>
            </div>
          )}
          {passwordMode === "changing" && (
            <div className="flex gap-2">
              <Input label="New password" type="password" value={passwordValue} onChange={e => setPasswordValue(e.target.value)} className="flex-1" />
              <button type="button"
                onClick={() => { triggerSave({ password: passwordValue }); setPasswordMode("set"); setPasswordValue(""); }}
                className="mt-5 h-9 rounded-lg bg-[var(--color-brand-500)] px-3 text-xs font-medium text-white hover:bg-[var(--color-brand-600)] transition-colors"
              >Set</button>
            </div>
          )}
        </section>

        {/* Allowlist */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Wallet Allowlist</h3>
          <Switch
            id="allowlist-toggle"
            label="Enable allowlist gating"
            checked={!!p?.requiresAllowlist}
            onChange={v => triggerSave({ requiresAllowlist: v })}
          />
          {p?.requiresAllowlist && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  value={newAddress}
                  onChange={e => setNewAddress(e.target.value)}
                  placeholder="0x..."
                  className="flex-1 h-8 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand-500)]"
                />
                <button type="button" onClick={() => { if (newAddress) addEntry(newAddress); }}
                  className="h-8 rounded-lg bg-[var(--color-brand-500)] px-2 text-white hover:bg-[var(--color-brand-600)] transition-colors"
                  aria-label="Add address">
                  <Plus className="h-4 w-4" />
                </button>
                <label className="h-8 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2 cursor-pointer flex items-center hover:bg-[var(--bg-subtle)] transition-colors" title="Import CSV">
                  <Upload className="h-4 w-4 text-[var(--text-tertiary)]" />
                  <input type="file" accept=".csv" onChange={handleCsvImport} className="sr-only" />
                </label>
              </div>
              <p className="text-xs text-[var(--text-tertiary)]">
                {allowlistData?.total ?? 0} address{(allowlistData?.total ?? 0) !== 1 ? "es" : ""} on allowlist
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)]">
                {(allowlistData?.items ?? []).map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between px-3 py-1.5">
                    <code className="text-xs text-[var(--text-secondary)] truncate">
                      {entry.walletAddress.slice(0, 10)}…{entry.walletAddress.slice(-6)}
                    </code>
                    <button type="button" onClick={() => removeEntry(entry.walletAddress)}
                      className="text-[var(--text-tertiary)] hover:text-[var(--color-error)] transition-colors ml-2" aria-label="Remove">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {(allowlistData?.items ?? []).length === 0 && (
                  <p className="px-3 py-3 text-xs text-[var(--text-tertiary)] text-center">No addresses added yet</p>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

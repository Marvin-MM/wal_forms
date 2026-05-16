"use client";
import { useState } from "react";
import { UserX, Wallet, CheckCircle2, X } from "lucide-react";
import { useConnectWallet, useWallets, useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";
import { cn } from "../../lib/utils";

type IdentityChoice = "anonymous" | "connected";

interface IdentityPanelProps {
  onChoiceChange?: (choice: IdentityChoice) => void;
}

export function IdentityPanel({ onChoiceChange }: IdentityPanelProps) {
  const [choice, setChoice] = useState<IdentityChoice>("anonymous");
  const wallets = useWallets();
  const { mutate: connect } = useConnectWallet();
  const { mutate: disconnect } = useDisconnectWallet();
  const currentAccount = useCurrentAccount();

  function handleChoose(c: IdentityChoice) {
    setChoice(c);
    onChoiceChange?.(c);
    if (c === "connected" && !currentAccount && wallets[0]) {
      connect({ wallet: wallets[0] });
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-subtle)] p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
        How would you like to submit?
      </p>
      <div className="grid grid-cols-2 gap-3">
        {/* Anonymous card */}
        <button
          type="button"
          onClick={() => handleChoose("anonymous")}
          className={cn(
            "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all duration-200",
            choice === "anonymous"
              ? "border-[var(--color-brand-500)] bg-[var(--color-brand-500)]/5 shadow-sm"
              : "border-[var(--border-default)] bg-[var(--bg-elevated)] hover:border-[var(--border-strong)]"
          )}
          aria-pressed={choice === "anonymous"}
        >
          <UserX
            className={cn(
              "h-5 w-5",
              choice === "anonymous" ? "text-[var(--color-brand-400)]" : "text-[var(--text-tertiary)]"
            )}
          />
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Anonymous</p>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)] leading-relaxed">
              Your response is recorded on-chain by the platform — not linked to any wallet.
            </p>
          </div>
        </button>

        {/* Connected card */}
        <button
          type="button"
          onClick={() => handleChoose("connected")}
          className={cn(
            "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all duration-200",
            choice === "connected"
              ? "border-[var(--color-brand-500)] bg-[var(--color-brand-500)]/5 shadow-sm"
              : "border-[var(--border-default)] bg-[var(--bg-elevated)] hover:border-[var(--border-strong)]"
          )}
          aria-pressed={choice === "connected"}
        >
          <Wallet
            className={cn(
              "h-5 w-5",
              choice === "connected" ? "text-[var(--color-brand-400)]" : "text-[var(--text-tertiary)]"
            )}
          />
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Connect Wallet</p>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)] leading-relaxed">
              Get a verifiable on-chain receipt owned by your wallet address.
            </p>
          </div>
        </button>
      </div>

      {/* Wallet connected indicator */}
      {choice === "connected" && currentAccount && (
        <div className="mt-3 flex items-center justify-between rounded-lg bg-[var(--color-brand-500)]/10 px-3 py-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[var(--color-brand-400)]" />
            <span className="text-xs font-mono text-[var(--color-brand-400)]">
              {currentAccount.address.slice(0, 8)}…{currentAccount.address.slice(-6)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => { disconnect(); handleChoose("anonymous"); }}
            className="text-[var(--text-tertiary)] hover:text-[var(--color-error)] transition-colors"
            aria-label="Disconnect wallet"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

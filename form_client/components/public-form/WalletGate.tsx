"use client";
import { Wallet } from "lucide-react";
import { useConnectWallet, useWallets, useCurrentAccount } from "@mysten/dapp-kit";
import { Button } from "../ui/Button";

interface WalletGateProps {
  children: React.ReactNode;
}

/** 
 * Renders children with an overlay when no wallet is connected.
 * Used for required_connected forms — users see the form but can't interact until connected.
 */
export function WalletGate({ children }: WalletGateProps) {
  const currentAccount = useCurrentAccount();
  const wallets = useWallets();
  const { mutate: connect, isPending } = useConnectWallet();

  if (currentAccount) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {/* Blurred preview */}
      <div className="pointer-events-none select-none blur-sm opacity-40" aria-hidden>
        {children}
      </div>

      {/* Overlay prompt */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="mx-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)]/95 backdrop-blur-sm p-8 text-center shadow-xl max-w-sm w-full">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-brand-500)]/10">
            <Wallet className="h-6 w-6 text-[var(--color-brand-400)]" />
          </div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Wallet required</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            This form requires a connected Sui wallet to submit.
          </p>
          <Button
            type="button"
            variant="primary"
            className="mt-6 w-full"
            loading={isPending}
            onClick={() => { if (wallets[0]) connect({ wallet: wallets[0] }); }}
          >
            Connect Wallet
          </Button>
        </div>
      </div>
    </div>
  );
}

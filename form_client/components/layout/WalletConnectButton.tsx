"use client";
import { useConnectWallet, useCurrentAccount, useDisconnectWallet, useWallets } from "@mysten/dapp-kit";
import { useState } from "react";
import { Wallet, ChevronDown, LogOut, LogIn } from "lucide-react";
import { Button } from "../ui/Button";
import { WalletAddress } from "../common/CopyButton";
import { useAuth } from "../../hooks/useAuth";
import { cn } from "../../lib/utils";
import { toast } from "sonner";

export function WalletConnectButton() {
  const wallets = useWallets();
  const { mutate: connectWallet, isPending: isConnecting } = useConnectWallet();
  const { mutate: disconnectWallet } = useDisconnectWallet();
  const currentAccount = useCurrentAccount();
  const { isAuthenticated, signIn, signOut, isInitializing } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  if (isInitializing) {
    return <div className="h-9 w-32 rounded-lg skeleton" />;
  }

  // Not connected
  if (!currentAccount) {
    return (
      <Button
        variant="primary"
        size="md"
        loading={isConnecting}
        onClick={() => {
          const preferred = wallets[0];
          if (preferred) {
            connectWallet({ wallet: preferred });
          } else {
            toast.error("No Sui wallet detected. Please install Sui Wallet or Suiet.");
          }
        }}
      >
        <Wallet className="h-4 w-4" />
        Connect Wallet
      </Button>
    );
  }

  // Connected but not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <WalletAddress address={currentAccount.address} showCopy={false} className="text-[var(--text-secondary)]" />
        <Button
          variant="primary"
          size="sm"
          loading={isSigningIn}
          onClick={async () => {
            setIsSigningIn(true);
            try {
              await signIn();
              toast.success("Signed in successfully");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Sign-in failed");
            } finally {
              setIsSigningIn(false);
            }
          }}
        >
          <LogIn className="h-3.5 w-3.5" />
          Sign In
        </Button>
      </div>
    );
  }

  // Connected & authenticated
  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu((v) => !v)}
        className={cn(
          "flex items-center gap-2 rounded-lg border px-3 py-1.5",
          "border-[var(--border-default)] bg-[var(--bg-elevated)]",
          "text-sm text-[var(--text-primary)] hover:bg-[var(--bg-muted)]",
          "transition-colors duration-[var(--duration-fast)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]"
        )}
        aria-label="Wallet menu"
        aria-expanded={showMenu}
        aria-haspopup="menu"
      >
        <div className="h-2 w-2 rounded-full bg-[var(--color-success)]" aria-hidden />
        <WalletAddress address={currentAccount.address} showCopy={false} />
        <ChevronDown className={cn("h-3.5 w-3.5 text-[var(--text-tertiary)] transition-transform", showMenu && "rotate-180")} />
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} aria-hidden />
          <div
            role="menu"
            className={cn(
              "absolute right-0 top-full z-20 mt-2 w-48 rounded-xl border shadow-[var(--shadow-lg)]",
              "bg-[var(--bg-elevated)] border-[var(--border-default)] p-1"
            )}
          >
            <button
              role="menuitem"
              onClick={() => { setShowMenu(false); void signOut(); }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--color-error)] hover:bg-[var(--color-error-bg)] transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign out & disconnect
            </button>
          </div>
        </>
      )}
    </div>
  );
}

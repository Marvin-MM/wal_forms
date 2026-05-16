"use client";
import { useEffect } from "react";
import { Shield, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

interface SponsorshipSignModalProps {
  open: boolean;
  onClose: () => void;
}

export function SponsorshipSignModal({ open, onClose }: SponsorshipSignModalProps) {
  // Auto-dismiss after a short delay — wallet prompt will appear and take over
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(onClose, 2500);
    return () => clearTimeout(id);
  }, [open, onClose]);

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-6 shadow-2xl focus:outline-none">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-500/10 shrink-0">
              <Shield className="h-6 w-6 text-green-400" />
            </div>
            <Dialog.Close asChild>
              <button
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>

          <Dialog.Title className="text-lg font-bold text-[var(--text-primary)] mb-2">
            Review your signature
          </Dialog.Title>

          <Dialog.Description className="text-sm text-[var(--text-secondary)] space-y-3 leading-relaxed">
            <p>
              Your wallet will ask you to sign a transaction to record your submission
              permanently on the Sui blockchain.
            </p>
            <div className="rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3">
              <p className="text-green-400 font-semibold text-sm">
                🎉 Gas sponsorship is active — you pay zero transaction fees.
              </p>
              <p className="text-green-400/70 text-xs mt-1">
                The platform covers all gas costs on your behalf.
              </p>
            </div>
            <p className="text-xs text-[var(--text-tertiary)]">
              This modal will dismiss automatically when your wallet prompt appears.
            </p>
          </Dialog.Description>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

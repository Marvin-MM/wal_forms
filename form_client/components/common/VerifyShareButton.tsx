"use client";
import { useState } from "react";
import { Share2, CheckCircle2 } from "lucide-react";

interface VerifyShareButtonProps {
  objectId: string;
}

export function VerifyShareButton({ objectId }: VerifyShareButtonProps) {
  const [copied, setCopied] = useState(false);

  function handleShare() {
    const url = `${window.location.origin}/verify/${objectId}`;
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-3 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors"
    >
      {copied ? (
        <>
          <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />
          Link copied!
        </>
      ) : (
        <>
          <Share2 className="h-4 w-4" />
          Share this proof
        </>
      )}
    </button>
  );
}

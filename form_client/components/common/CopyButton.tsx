"use client";
import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "../../lib/utils";
import { toast } from "sonner";

interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
  size?: "sm" | "md";
}

export function CopyButton({ value, label = "Copy", className, size = "sm" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }

  const Icon = copied ? Check : Copy;
  return (
    <button
      onClick={handleCopy}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md font-medium transition-colors",
        "text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]",
        size === "sm" && "h-6 px-1.5 text-xs",
        size === "md" && "h-8 px-2 text-sm",
        copied && "text-[var(--color-success)]",
        className
      )}
    >
      <Icon className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />
      {label && <span>{copied ? "Copied!" : label}</span>}
    </button>
  );
}

interface WalletAddressProps {
  address: string;
  chars?: number;
  showCopy?: boolean;
  className?: string;
}

export function WalletAddress({ address, chars = 6, showCopy = true, className }: WalletAddressProps) {
  const truncated = `${address.slice(0, chars)}...${address.slice(-chars)}`;
  return (
    <span className={cn("inline-flex items-center gap-1 font-mono text-xs", className)}>
      <span title={address} className="text-[var(--text-secondary)]">{truncated}</span>
      {showCopy && <CopyButton value={address} label="" size="sm" />}
    </span>
  );
}

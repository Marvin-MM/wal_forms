import { ExternalLink } from "lucide-react";
import { cn, suiExplorerUrl, walrusBlobUrl } from "../../lib/utils";
import { env } from "../../lib/env";

interface SuiExplorerLinkProps {
  objectId: string;
  label?: string;
  className?: string;
}

export function SuiExplorerLink({ objectId, label, className }: SuiExplorerLinkProps) {
  const url = suiExplorerUrl(objectId, env.NEXT_PUBLIC_SUI_NETWORK);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1 text-sm text-[var(--color-brand-400)] hover:text-[var(--color-brand-300)] transition-colors underline-offset-2 hover:underline",
        className
      )}
    >
      {label ?? `${objectId.slice(0, 8)}...`}
      <ExternalLink className="h-3 w-3 shrink-0" />
    </a>
  );
}

interface WalrusLinkProps {
  blobId: string;
  label?: string;
  className?: string;
}

export function WalrusLink({ blobId, label, className }: WalrusLinkProps) {
  const url = walrusBlobUrl(blobId, env.NEXT_PUBLIC_WALRUS_AGGREGATOR_ENDPOINT);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1 text-sm text-[var(--color-brand-400)] hover:text-[var(--color-brand-300)] transition-colors underline-offset-2 hover:underline",
        className
      )}
    >
      {label ?? `blob:${blobId.slice(0, 8)}...`}
      <ExternalLink className="h-3 w-3 shrink-0" />
    </a>
  );
}

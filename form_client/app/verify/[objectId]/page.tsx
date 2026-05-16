import type { Metadata } from "next";
import { Shield, CheckCircle2, Share2, ExternalLink, AlertTriangle } from "lucide-react";
import { apiRequest } from "../../../lib/api/client";
import { Header } from "../../../components/layout/Header";
import { formatDate } from "../../../lib/utils";
import { VerifyShareButton } from "../../../components/common/VerifyShareButton";

interface VerifyPageProps {
  params: Promise<{ objectId: string }>;
}

interface VerifyData {
  submission: {
    submissionId: string;
    formId: string;
    walrusBlobId: string;
    suiObjectId: string | null;
    identityMode: string | null;
    isAnonymous: boolean;
    isSponsored: boolean;
    createdAt: string;
  };
  form: {
    title: string;
    ownerWallet: string;
  } | null;
}

export async function generateMetadata({ params }: VerifyPageProps): Promise<Metadata> {
  const { objectId } = await params;
  return {
    title: `Verify Submission · ${objectId.slice(0, 12)}…`,
    description:
      "Independently verify this on-chain submission receipt from WalrusForms — permanently recorded on the Sui blockchain.",
  };
}

export default async function VerifyPage({ params }: VerifyPageProps) {
  const { objectId } = await params;
  const isDemoId = objectId === "0x0";

  let verifyData: VerifyData | null = null;
  let error: string | null = null;

  if (!isDemoId) {
    try {
      verifyData = await apiRequest<VerifyData>(`/verify/${objectId}`, { skipAuth: true });
    } catch (err) {
      error = err instanceof Error ? err.message : "Submission receipt not found";
    }
  }

  const walrusAgg = process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_ENDPOINT ?? "";

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        {/* Hero */}
        <div className="mb-10 text-center">
          <div
            className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ${
              verifyData
                ? "bg-green-500/10"
                : error
                ? "bg-[var(--color-error-bg)]"
                : "bg-[var(--color-brand-500)]/10"
            }`}
          >
            {verifyData ? (
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            ) : error ? (
              <AlertTriangle className="h-8 w-8 text-[var(--color-error)]" />
            ) : (
              <Shield className="h-8 w-8 text-[var(--color-brand-400)]" />
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            {verifyData
              ? "Verified On-Chain Submission"
              : error
              ? "Verification Failed"
              : "Submission Verification"}
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {verifyData
              ? "This submission exists permanently on the Sui blockchain and cannot be altered."
              : "Data fetched directly from the Sui blockchain — no WalrusForms server involved."}
          </p>
        </div>

        {/* Demo state */}
        {isDemoId && (
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-6 text-center">
            <p className="text-[var(--text-secondary)]">
              Demo page. Replace the URL with a real Sui object ID to verify a submission receipt.
            </p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="rounded-xl border border-[var(--color-error)]/30 bg-[var(--color-error-bg)] p-6">
            <p className="font-semibold text-[var(--color-error)]">
              Object not found or not a WalrusForms submission receipt
            </p>
            <p className="mt-1 text-sm text-[var(--color-error)]/80">{error}</p>
          </div>
        )}

        {/* Verification card */}
        {verifyData && (
          <div className="space-y-4">
            {/* Verified banner */}
            <div className="flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/5 p-4">
              <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
              <div>
                <p className="font-semibold text-green-400">Verified on-chain ✓</p>
                <p className="text-xs text-green-400/70">
                  This receipt exists on the Sui blockchain and cannot be altered or deleted.
                </p>
              </div>
            </div>

            {/* Receipt details */}
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] divide-y divide-[var(--border-subtle)]">
              {verifyData.form?.title && (
                <VerifyRow label="Form" value={verifyData.form.title} />
              )}
              <VerifyRow
                label="Receipt Object ID"
                value={objectId}
                href={`https://suiscan.xyz/testnet/object/${objectId}`}
              />
              <VerifyRow
                label="Submitter"
                value={verifyData.submission.isAnonymous ? "Anonymous" : "Connected wallet"}
              />
              <VerifyRow
                label="Walrus Blob ID"
                value={verifyData.submission.walrusBlobId}
                href={`${walrusAgg}/v1/blobs/${verifyData.submission.walrusBlobId}`}
                mono
              />
              <VerifyRow
                label="Timestamp"
                value={formatDate(new Date(verifyData.submission.createdAt))}
              />
              <VerifyRow
                label="Sponsored"
                value={verifyData.submission.isSponsored ? "Yes (platform paid gas)" : "No"}
              />
            </div>

            {/* Form owner context */}
            {verifyData.form && (
              <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
                  Form Owner
                </p>
                <code className="text-xs font-mono text-[var(--text-secondary)]">
                  {verifyData.form.ownerWallet}
                </code>
              </div>
            )}

            {/* Share button */}
            <VerifyShareButton objectId={objectId} />

            {/* Plain-language explainer */}
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-subtle)] p-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
                What does this mean?
              </p>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                This page proves that a form submission was recorded on the{" "}
                <strong className="text-[var(--text-primary)]">Sui blockchain</strong>. Unlike a
                traditional form tool, the receipt shown above was written to a public, immutable ledger —
                no company, including WalrusForms, can alter or delete it.
              </p>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                The submission content is stored on{" "}
                <strong className="text-[var(--text-primary)]">Walrus</strong>, a decentralized storage
                network, identified by the Blob ID above. You can access the raw content directly from
                any Walrus aggregator node without going through WalrusForms servers.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function VerifyRow({
  label,
  value,
  href,
  mono,
}: {
  label: string;
  value: string;
  href?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3">
      <span className="text-xs text-[var(--text-tertiary)] shrink-0">{label}</span>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`text-sm text-[var(--color-brand-400)] hover:underline break-all text-right flex items-center gap-1 ${
            mono ? "font-mono" : ""
          }`}
        >
          {value.length > 24 ? `${value.slice(0, 12)}…${value.slice(-6)}` : value}
          <ExternalLink className="h-3 w-3 shrink-0" />
        </a>
      ) : (
        <span
          className={`text-sm text-[var(--text-primary)] break-all text-right ${
            mono ? "font-mono" : ""
          }`}
        >
          {value}
        </span>
      )}
    </div>
  );
}

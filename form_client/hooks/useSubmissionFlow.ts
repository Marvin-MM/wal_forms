"use client";
/**
 * useSubmissionFlow — encapsulates the entire submission pipeline.
 *
 * The form page calls `submit(payload)` and reacts only to `status` and `error`.
 * All branching between anonymous, sponsored (two-phase), and self-paid flows
 * is invisible to the consuming component.
 *
 * Status machine:
 *   idle → uploading → awaiting_sponsorship → awaiting_signature → broadcasting
 *        → confirming → complete | error
 */
import { useState, useCallback } from "react";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSignPersonalMessage,
  useSignTransaction,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { toast } from "sonner";
import type { SubmissionIdentityMode } from "../shared/schemas/form-schema";
import {
  createSubmission,
  type SubmissionComplete,
  type SubmissionSponsored,
} from "../lib/api/submissions";
import { encryptSubmission } from "../lib/seal";
import { getSealConfig } from "../lib/api/misc";
import { uploadBlobPromise } from "../lib/walrus";
import { env } from "../lib/env";

export type SubmissionStatus =
  | "idle"
  | "uploading"
  | "awaiting_sponsorship"
  | "awaiting_signature"
  | "broadcasting"
  | "confirming"
  | "complete"
  | "error";

interface SubmissionResult {
  submissionId: string;
  digest: string | null;
  suiObjectId: string | null;
}

interface UseSubmissionFlowOptions {
  formId: string;
  formObjectId: string | null;
  identityMode: SubmissionIdentityMode;
  isPrivate: boolean;
  ownerWallet: string;
  /** Set to true when the form has an active sponsorship pool */
  sponsorshipEnabled?: boolean;
}

export function useSubmissionFlow({
  formId,
  formObjectId,
  identityMode,
  isPrivate,
  ownerWallet,
  sponsorshipEnabled = false,
}: UseSubmissionFlowOptions) {
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signTransaction } = useSignTransaction();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();

  const [status, setStatus] = useState<SubmissionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmissionResult | null>(null);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setResult(null);
  }, []);

  const submit = useCallback(
    async (rawData: Record<string, unknown>, turnstileToken: string, password?: string) => {
      setStatus("uploading");
      setError(null);

      try {
        // ── Step 1: Encryption + Walrus upload ─────────────────────────────
        let isEncrypted = false;
        let blobId: string;

        if (isPrivate) {
          const sealConfig = await getSealConfig();
          if (sealConfig.enabled) {
            const encrypted = await encryptSubmission(rawData, sealConfig, ownerWallet);
            const blob = new Blob([encrypted as unknown as BlobPart], {
              type: "application/octet-stream",
            });
            const uploadResult = await uploadBlobPromise(blob as File, {});
            blobId = uploadResult.blobId;
            isEncrypted = true;
          } else {
            const blob = new Blob([JSON.stringify(rawData)], { type: "application/json" });
            const uploadResult = await uploadBlobPromise(blob as File, {});
            blobId = uploadResult.blobId;
          }
        } else {
          const blob = new Blob([JSON.stringify(rawData)], { type: "application/json" });
          const uploadResult = await uploadBlobPromise(blob as File, {});
          blobId = uploadResult.blobId;
        }

        // ── Step 2: Determine identity mode ────────────────────────────────
        const effectiveMode = identityMode;
        const walletAddress = currentAccount?.address;

        // Anonymous flow — no wallet
        if (effectiveMode === "anonymous" || !walletAddress) {
          setStatus("awaiting_sponsorship");
          const response = await createSubmission(formId, {
            identity_mode: "anonymous",
            blobId,
            turnstileToken,
            isEncrypted,
            password,
          });
          const complete = response as SubmissionComplete;
          setResult({
            submissionId: complete.submissionId,
            digest: complete.digest,
            suiObjectId: null,
          });
          setStatus("complete");
          return;
        }

        // Sponsored two-phase flow. This is intentionally unavailable in the UI
        // until forms have a real indexed SponsorshipPool and client-built PTBs.
        if (sponsorshipEnabled) {
          setStatus("awaiting_sponsorship");
          const phase1 = await createSubmission(formId, {
            identity_mode: "sponsored",
            blobId,
            turnstileToken,
            isEncrypted,
            unsignedTxBytes: "",
            submitterWallet: walletAddress,
            password,
          });

          if (!("phase" in phase1) || phase1.phase !== "sponsored") {
            throw new Error("Expected sponsored phase 1 response");
          }
          const sponsored = phase1 as SubmissionSponsored;

          setStatus("awaiting_signature");
          // Sign the sponsored transaction bytes
          const { signature, bytes } = await signTransaction({
            transaction: sponsored.sponsoredTxBytesB64,
          });

          setStatus("broadcasting");
          const phase2 = await createSubmission(formId, {
            identity_mode: "sponsored_complete",
            sessionToken: sponsored.sessionToken,
            signedTxBytes: `${bytes}:${signature}`,
          });
          const complete = phase2 as SubmissionComplete;

          setStatus("confirming");
          // Brief confirming state for UX feedback
          await new Promise((r) => setTimeout(r, 800));

          setResult({
            submissionId: complete.submissionId,
            digest: complete.digest,
            suiObjectId: null,
          });
          setStatus("complete");
          return;
        }

        // Self-paid flow (wallet connected, no sponsorship)
        if (!formObjectId) {
          setStatus("awaiting_signature");
          const signedMessage = buildConnectedSubmissionMessage({
            formId,
            blobId,
            submitterWallet: walletAddress,
            isEncrypted,
          });
          const { signature } = await signPersonalMessage({
            message: new TextEncoder().encode(signedMessage),
          });
          const response = await createSubmission(formId, {
            identity_mode: "connected_offchain",
            blobId,
            turnstileToken,
            isEncrypted,
            submitterWallet: walletAddress,
            signedMessage,
            signature,
            password,
          });
          const complete = response as SubmissionComplete;
          setStatus("confirming");
          await new Promise((r) => setTimeout(r, 500));
          setResult({ submissionId: complete.submissionId, digest: null, suiObjectId: null });
          setStatus("complete");
          return;
        }

        const tx = new Transaction();
        tx.moveCall({
          target: `${env.NEXT_PUBLIC_SUI_PACKAGE_ADDRESS}::submission::submit`,
          arguments: [
            tx.object(formObjectId),
            tx.pure.vector("u8", blobIdToBytes(blobId)),
            tx.pure.bool(isEncrypted),
          ],
        });

        setStatus("awaiting_signature");
        const executed = await signAndExecuteTransaction({ transaction: tx });
        const digest = "digest" in executed ? executed.digest : "";
        if (!digest) throw new Error("Wallet transaction did not return a digest");

        const response = await createSubmission(formId, {
          identity_mode: "self_paid",
          blobId,
          turnstileToken,
          isEncrypted,
          submitterWallet: walletAddress,
          transactionDigest: digest,
          password,
        });
        const complete = response as SubmissionComplete;
        setStatus("confirming");
        await new Promise((r) => setTimeout(r, 800));
        setResult({ submissionId: complete.submissionId, digest: complete.digest, suiObjectId: null });
        setStatus("complete");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Submission failed";
        setError(msg);
        setStatus("error");
        toast.error(msg);
      }
    },
    [
      formId,
      formObjectId,
      identityMode,
      isPrivate,
      ownerWallet,
      sponsorshipEnabled,
      currentAccount,
      signTransaction,
      signAndExecuteTransaction,
      signPersonalMessage,
    ]
  );

  const statusLabel: Record<SubmissionStatus, string> = {
    idle: "Submit",
    uploading: "Uploading files...",
    awaiting_sponsorship: "Preparing transaction...",
    awaiting_signature: "Sign in wallet...",
    broadcasting: "Broadcasting...",
    confirming: "Confirming on-chain...",
    complete: "Submitted ✓",
    error: "Submit",
  };

  return {
    submit,
    status,
    error,
    result,
    reset,
    isSubmitting: status !== "idle" && status !== "complete" && status !== "error",
    buttonLabel: statusLabel[status],
  };
}

function buildConnectedSubmissionMessage(params: {
  formId: string;
  blobId: string;
  submitterWallet: string;
  isEncrypted: boolean;
}): string {
  return [
    "WalrusForms connected submission",
    `Form: ${params.formId}`,
    `Blob: ${params.blobId}`,
    `Wallet: ${params.submitterWallet}`,
    `Encrypted: ${params.isEncrypted ? "true" : "false"}`,
  ].join("\n");
}

function blobIdToBytes(blobId: string): number[] {
  const normalized = blobId.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  const binary = atob(padded);
  return Array.from(binary, (char) => char.charCodeAt(0));
}

import { apiRequest } from "./client";
import type { Submission, SubmissionPriority, SubmissionReceipt } from "../../shared/types/entities";
import type { PaginatedResponse } from "../../shared/types/api";

// ── Admin read/update types ────────────────────────────────────────────────────

export interface UpdateSubmissionInput {
  adminNotes?: string;
  priority?: SubmissionPriority;
  isReviewed?: boolean;
}

export interface ListSubmissionsQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  priority?: SubmissionPriority;
  reviewed?: boolean;
}

// ── Submission creation — three-flow discriminated union ──────────────────────

export type AnonymousSubmissionInput = {
  identity_mode: "anonymous";
  blobId: string;
  turnstileToken: string;
  isEncrypted: boolean;
  password?: string;
};

export type SponsoredPhase1Input = {
  identity_mode: "sponsored";
  blobId: string;
  turnstileToken: string;
  isEncrypted: boolean;
  unsignedTxBytes: string;
  submitterWallet: string;
  password?: string;
};

export type SponsoredPhase2Input = {
  identity_mode: "sponsored_complete";
  sessionToken: string;
  signedTxBytes: string;
};

export type SelfPaidInput = {
  identity_mode: "self_paid";
  blobId: string;
  turnstileToken: string;
  isEncrypted: boolean;
  submitterWallet: string;
  transactionDigest: string;
  password?: string;
};

export type ConnectedOffchainInput = {
  identity_mode: "connected_offchain";
  blobId: string;
  turnstileToken: string;
  isEncrypted: boolean;
  submitterWallet: string;
  signedMessage: string;
  signature: string;
  password?: string;
};

export type CreateSubmissionInput =
  | AnonymousSubmissionInput
  | SponsoredPhase1Input
  | SponsoredPhase2Input
  | SelfPaidInput
  | ConnectedOffchainInput;

// ── Response shapes ───────────────────────────────────────────────────────────

export interface SubmissionComplete {
  phase: "complete";
  submissionId: string;
  digest: string | null;
  suiObjectId?: string | null;
}

export interface SubmissionSponsored {
  phase: "sponsored";
  sessionToken: string;
  sponsoredTxBytesB64: string;
  expiresAt: string;
}

export type SubmissionResponse = SubmissionComplete | SubmissionSponsored;

// ── API functions ─────────────────────────────────────────────────────────────

export async function createSubmission(
  formId: string,
  input: CreateSubmissionInput
): Promise<SubmissionResponse> {
  return apiRequest<SubmissionResponse>(`/forms/${formId}/submissions`, {
    method: "POST",
    body: input,
    skipAuth: true,
  });
}

export async function listSubmissions(
  formId: string,
  query: ListSubmissionsQuery = {}
): Promise<PaginatedResponse<Submission>> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  if (query.search) params.set("search", query.search);
  if (query.priority) params.set("priority", query.priority);
  if (query.reviewed !== undefined) params.set("reviewed", String(query.reviewed));
  const qs = params.toString();
  return apiRequest<PaginatedResponse<Submission>>(
    `/forms/${formId}/submissions${qs ? `?${qs}` : ""}`
  );
}

export async function getSubmission(formId: string, submissionId: string): Promise<Submission> {
  return apiRequest<Submission>(`/forms/${formId}/submissions/${submissionId}`);
}

export async function updateSubmission(
  formId: string,
  submissionId: string,
  input: UpdateSubmissionInput
): Promise<Submission> {
  return apiRequest<Submission>(`/forms/${formId}/submissions/${submissionId}`, {
    method: "PATCH",
    body: input,
  });
}

// ── My Submissions (submitter data portability) ───────────────────────────────

export async function listMySubmissions(): Promise<SubmissionReceipt[]> {
  return apiRequest<SubmissionReceipt[]>("/me/submissions");
}

export async function deleteMySubmission(blobId: string): Promise<{ digest: string }> {
  return apiRequest<{ digest: string }>(`/me/submissions/${encodeURIComponent(blobId)}`, {
    method: "DELETE",
  });
}

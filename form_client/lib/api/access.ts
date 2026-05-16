import { apiRequest } from "./client";
import type { AccessPolicy, AllowlistEntry } from "../../shared/types/entities";
import type { PaginatedResponse } from "../../shared/types/api";

export interface UpsertAccessPolicyInput {
  opensAt?: string | null;
  closesAt?: string | null;
  hasResponseLimit?: boolean;
  responseLimit?: number | null;
  /** Send plaintext password; backend will hash it. Only sent when changing. */
  password?: string | null;
  clearPassword?: boolean;
  requiresAllowlist?: boolean;
}

export async function getAccessPolicy(formId: string): Promise<AccessPolicy | null> {
  try {
    return await apiRequest<AccessPolicy>(`/forms/${formId}/access-policy/owner`);
  } catch {
    return null;
  }
}

export async function getPublicAccessPolicy(formId: string): Promise<AccessPolicy | null> {
  try {
    return await apiRequest<AccessPolicy>(`/forms/${formId}/access-policy`, { skipAuth: true });
  } catch {
    return null;
  }
}

export async function upsertAccessPolicy(
  formId: string,
  input: UpsertAccessPolicyInput
): Promise<AccessPolicy> {
  return apiRequest<AccessPolicy>(`/forms/${formId}/access-policy`, {
    method: "PUT",
    body: input,
  });
}

export async function listAllowlist(
  formId: string,
  page = 1,
  pageSize = 50
): Promise<PaginatedResponse<AllowlistEntry>> {
  return apiRequest<PaginatedResponse<AllowlistEntry>>(
    `/forms/${formId}/allowlist?page=${page}&pageSize=${pageSize}`
  );
}

export async function addAllowlistEntry(
  formId: string,
  walletAddress: string
): Promise<AllowlistEntry> {
  return apiRequest<AllowlistEntry>(`/forms/${formId}/allowlist`, {
    method: "POST",
    body: { walletAddress },
  });
}

export async function removeAllowlistEntry(
  formId: string,
  walletAddress: string
): Promise<void> {
  await apiRequest<{ removed: string }>(
    `/forms/${formId}/allowlist/${encodeURIComponent(walletAddress)}`,
    { method: "DELETE" }
  );
}

/** Public endpoint — check if a wallet is on the form's allowlist */
export async function checkAccess(
  formId: string,
  wallet: string
): Promise<{ allowed: boolean }> {
  return apiRequest<{ allowed: boolean }>(
    `/forms/${formId}/access/check?wallet=${encodeURIComponent(wallet)}`,
    { skipAuth: true }
  );
}

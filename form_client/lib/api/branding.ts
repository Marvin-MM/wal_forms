import { apiRequest } from "./client";
import type { FormBranding } from "../../shared/types/entities";

export interface UpsertBrandingInput {
  logoWalrusBlobId?: string | null;
  logoSuiObjectId?: string | null;
  accentColor?: string | null;
  backgroundColor?: string | null;
  fontFamily?: string | null;
  submitButtonText?: string | null;
  thankYouMessage?: string | null;
  showWalrusFormsBranding?: boolean;
}

export async function getFormBranding(formId: string): Promise<FormBranding | null> {
  try {
    return await apiRequest<FormBranding>(`/forms/${formId}/branding`, { skipAuth: true });
  } catch {
    return null;
  }
}

export async function upsertFormBranding(
  formId: string,
  input: UpsertBrandingInput
): Promise<FormBranding> {
  return apiRequest<FormBranding>(`/forms/${formId}/branding`, {
    method: "PUT",
    body: input,
  });
}

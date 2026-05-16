import { apiRequest } from "./client";
import type { Analysis } from "../../shared/types/entities";

export async function triggerAnalysis(formId: string): Promise<{ analysisId: string; status: string }> {
  return apiRequest<{ analysisId: string; status: string }>(`/forms/${formId}/analysis`, {
    method: "POST",
  });
}

export async function getAnalysis(formId: string): Promise<Analysis> {
  return apiRequest<Analysis>(`/forms/${formId}/analysis`);
}

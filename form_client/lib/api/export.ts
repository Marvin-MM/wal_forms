import { apiRequest } from "./client";
import type { ExportJob } from "../../shared/types/entities";

export async function triggerExport(formId: string): Promise<{ exportId: string; status: string }> {
  return apiRequest<{ exportId: string; status: string }>(`/forms/${formId}/export`, {
    method: "POST",
  });
}

export async function getExport(formId: string): Promise<ExportJob> {
  return apiRequest<ExportJob>(`/forms/${formId}/export`);
}

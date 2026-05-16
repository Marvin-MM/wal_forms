import { apiRequest } from "./client";
import type { AnalyticsSnapshot } from "../../shared/types/entities";

export async function getFormAnalytics(
  formId: string,
  limit = 30
): Promise<AnalyticsSnapshot[]> {
  return apiRequest<AnalyticsSnapshot[]>(
    `/forms/${formId}/analytics?limit=${limit}`
  );
}

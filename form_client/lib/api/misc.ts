import { apiRequest } from "./client";
import type { HealthResponse, SealConfig } from "../../shared/types/api";

export async function getHealth(): Promise<HealthResponse> {
  return apiRequest<HealthResponse>("/health", { skipAuth: true });
}

export async function getSealConfig(): Promise<SealConfig> {
  return apiRequest<SealConfig>("/seal/config", { skipAuth: true });
}

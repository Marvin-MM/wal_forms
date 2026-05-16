import { apiRequest } from "./client";
import type { Admin } from "../../shared/types/entities";

export async function listAdmins(formId: string): Promise<Admin[]> {
  return apiRequest<Admin[]>(`/forms/${formId}/admins`);
}

export async function addAdmin(formId: string, walletAddress: string): Promise<Admin> {
  return apiRequest<Admin>(`/forms/${formId}/admins`, {
    method: "POST",
    body: { walletAddress },
  });
}

export async function removeAdmin(formId: string, walletAddress: string): Promise<void> {
  await apiRequest<{ message: string }>(`/forms/${formId}/admins/${walletAddress}`, {
    method: "DELETE",
  });
}

import { apiRequest } from "./client";
import type { Form } from "../../shared/types/entities";
import type { FormSchemaType } from "../../shared/schemas/form-schema";
import type { PaginatedResponse } from "../../shared/types/api";

export interface CreateFormInput {
  schema: FormSchemaType;
  isPrivate: boolean;
  submissionIdentityMode: "anonymous" | "optional_connected" | "required_connected";
}

export interface UpdateFormInput {
  schema: FormSchemaType;
  isPrivate?: boolean;
  submissionIdentityMode?: "anonymous" | "optional_connected" | "required_connected";
}

export interface ListFormsQuery {
  page?: number;
  pageSize?: number;
}

export async function getForm(formId: string): Promise<Form> {
  return apiRequest<Form>(`/forms/${formId}`, { skipAuth: true });
}

export async function createForm(input: CreateFormInput): Promise<Form> {
  return apiRequest<Form>("/forms", { method: "POST", body: input });
}

export async function updateForm(formId: string, input: UpdateFormInput): Promise<Form> {
  return apiRequest<Form>(`/forms/${formId}`, { method: "PUT", body: input });
}

export async function deleteForm(formId: string): Promise<void> {
  await apiRequest<{ message: string }>(`/forms/${formId}`, { method: "DELETE" });
}

export async function listForms(query: ListFormsQuery = {}): Promise<PaginatedResponse<Form>> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  const qs = params.toString();
  return apiRequest<PaginatedResponse<Form>>(`/forms${qs ? `?${qs}` : ""}`);
}

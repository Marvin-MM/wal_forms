import { apiRequest } from "./client";
import type { UploadSession } from "../../shared/types/entities";

export async function createUploadSession(input: {
  formId: string;
  allowedMimeTypes: string[];
  maxFileSize: number;
  uploadPurpose?: "submission" | "branding_logo" | "branding_background" | "branding_favicon";
}): Promise<UploadSession> {
  return apiRequest<UploadSession>("/uploads/session", {
    method: "POST",
    body: input,
  });
}

export async function createSubmissionUploadSession(input: {
  formId: string;
  fieldId: string;
  mimeType: string;
  fileSize: number;
}): Promise<UploadSession> {
  return apiRequest<UploadSession>("/uploads/submission-session", {
    method: "POST",
    body: input,
    skipAuth: true,
  });
}

export async function confirmUpload(input: {
  sessionToken: string;
  blobId: string;
}): Promise<{ blobId: string; confirmed: boolean }> {
  return apiRequest<{ blobId: string; confirmed: boolean }>("/uploads/confirm", {
    method: "POST",
    body: input,
    skipAuth: true,
  });
}

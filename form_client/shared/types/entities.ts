/**
 * Shared entity types — mirrors backend domain entities exactly.
 */
import type { FormSchemaType, SubmissionIdentityMode } from "../schemas/form-schema";

// ── Form ─────────────────────────────────────────────────────────────────────

export interface Form {
  id: string;
  ownerWallet: string;
  walrusBlobId: string;
  schemaVersion: number;
  suiObjectId: string | null;
  isPrivate: boolean;
  isClosed: boolean;
  isDeleted: boolean;
  submissionIdentityMode: SubmissionIdentityMode;
  denormalizedSchema: FormSchemaType;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── SchemaVersion ─────────────────────────────────────────────────────────────

export interface SchemaVersion {
  id: string;
  formId: string;
  blobId: string;
  versionNumber: number;
  parentBlobId: string | null;
  suiObjectId: string | null;
  createdAt: string;
}

// ── Submission ────────────────────────────────────────────────────────────────

export type SubmissionPriority = "low" | "medium" | "high" | "urgent";

export interface Submission {
  id: string;
  formId: string;
  walrusBlobId: string;
  suiObjectId: string | null;
  isEncrypted: boolean;
  submitterWallet: string | null;
  adminNotes: string | null;
  priority: SubmissionPriority;
  isReviewed: boolean;
  /** Submission identity mode used when this submission was created */
  submissionIdentityMode: SubmissionIdentityMode | null;
  isAnonymous: boolean;
  isSponsored: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── SubmissionReceipt (for /me/submissions) ────────────────────────────────

export interface SubmissionReceipt {
  id: string;
  formId: string;
  formTitle: string;
  formDescription: string | null;
  walrusBlobId: string;
  suiObjectId: string | null;
  isEncrypted: boolean;
  isAnonymous: boolean;
  isSponsored: boolean;
  schemaVersion: number;
  createdAt: string;
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export interface Admin {
  id: string;
  formId: string;
  walletAddress: string;
  createdAt: string;
}

// ── Analysis ──────────────────────────────────────────────────────────────────

export type JobStatus = "pending" | "running" | "completed" | "failed";

export interface AnalysisResult {
  themeClusters: Array<{ theme: string; count: number; examples: string[] }>;
  sentimentSummary:
    | string
    | { overall?: string; positive?: number; neutral?: number; negative?: number };
  priorityRecommendations: Array<
    string | { suggestedPriority?: string; reason?: string; [key: string]: unknown }
  >;
  totalAnalyzed: number;
}

export interface Analysis {
  id: string;
  formId: string;
  result: AnalysisResult | null;
  jobStatus: JobStatus;
  jobId: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── ExportJob ─────────────────────────────────────────────────────────────────

export interface ExportJob {
  id: string;
  formId: string;
  status: JobStatus;
  resultBlobId: string | null;
  jobId: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── UploadSession ─────────────────────────────────────────────────────────────

export interface UploadSession {
  sessionToken: string;
  formId: string;
  publisherEndpoint?: string;
  allowedMimeTypes: string[];
  maxFileSize: number;
  uploadPurpose: "submission" | "branding_logo" | "branding_background" | "branding_favicon";
  expiresAt: string;
}

// ── FormBranding ───────────────────────────────────────────────────────────────

export interface FormBranding {
  id: string;
  formId: string;
  logoWalrusBlobId: string | null;
  logoSuiObjectId: string | null;
  accentColor: string | null;
  backgroundColor: string | null;
  fontFamily: string | null;
  submitButtonText: string | null;
  thankYouMessage: string | null;
  showWalrusFormsBranding: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── AccessPolicy ───────────────────────────────────────────────────────────────

export interface AccessPolicy {
  id: string;
  formId: string;
  opensAt: string | null;
  closesAt: string | null;
  hasResponseLimit: boolean;
  responseLimit: number | null;
  currentResponseCount?: number;
  hasPassword: boolean;
  requiresAllowlist: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── AllowlistEntry ────────────────────────────────────────────────────────────

export interface AllowlistEntry {
  id: string;
  formId: string;
  walletAddress: string;
  createdAt: string;
}

// ── NotificationPreferences ───────────────────────────────────────────────────

export type NotificationFrequency = "immediate" | "hourly" | "daily";

export interface NotificationPreferences {
  id: string;
  formId: string;
  emailAddresses: string[];
  discordWebhookUrl: string | null;
  customWebhookUrl: string | null;
  customWebhookSecret: string | null;
  frequency: NotificationFrequency;
  createdAt: string;
  updatedAt: string;
}

// ── AnalyticsSnapshot ─────────────────────────────────────────────────────────

export interface FieldAnalytics {
  fieldId: string;
  fieldType: string;
  label: string;
  responseCount: number;
  /** For rating/scale fields */
  average?: number;
  /** Distribution map for rating/select/radio/multiselect fields */
  distribution?: Record<string, number>;
  /** Average character length for text/textarea fields */
  avgCharLength?: number;
  encryptedCount?: number;
}

export interface AnalyticsSnapshot {
  id: string;
  formId: string;
  periodStart: string;
  resolution: "daily" | "hourly";
  totalSubmissions: number;
  anonymousSubmissions: number;
  sponsoredSubmissions: number;
  selfPaidSubmissions: number;
  createdAt: string;
}

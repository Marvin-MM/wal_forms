/**
 * TanStack Query key factory — centralized, typed, hierarchical.
 * All query keys follow the [resource, ...params] pattern.
 */

export const queryKeys = {
  // Health / stats
  health: () => ["health"] as const,

  // Forms
  forms: {
    all: () => ["forms"] as const,
    list: (page?: number, pageSize?: number) => ["forms", "list", { page, pageSize }] as const,
    detail: (formId: string) => ["forms", formId] as const,
    versions: (formId: string) => ["forms", formId, "versions"] as const,
  },

  // Submissions
  submissions: {
    all: (formId: string) => ["submissions", formId] as const,
    list: (formId: string, query: Record<string, unknown>) =>
      ["submissions", formId, "list", query] as const,
    detail: (formId: string, submissionId: string) =>
      ["submissions", formId, submissionId] as const,
    blob: (blobId: string) => ["submissions", "blob", blobId] as const,
  },

  // Admins
  admins: {
    list: (formId: string) => ["admins", formId] as const,
  },

  // Analysis
  analysis: {
    latest: (formId: string) => ["analysis", formId] as const,
  },

  // Export
  export: {
    latest: (formId: string) => ["export", formId] as const,
  },

  // Seal config
  sealConfig: () => ["seal", "config"] as const,

  // On-chain (Sui RPC)
  onchain: {
    form: (objectId: string) => ["onchain", "form", objectId] as const,
    receipt: (objectId: string) => ["onchain", "receipt", objectId] as const,
  },

  // Branding
  branding: {
    detail: (formId: string) => ["branding", formId] as const,
  },

  // Access control
  access: {
    policy: (formId: string) => ["access", "policy", formId] as const,
    allowlist: (formId: string) => ["access", "allowlist", formId] as const,
  },

  // Analytics
  analytics: {
    snapshots: (formId: string, wallet: string, limit?: number) =>
      ["analytics", formId, wallet, limit] as const,
  },

  // Notifications
  notifications: {
    prefs: (formId: string, wallet: string) => ["notifications", formId, wallet] as const,
  },

  // My submissions (submitter view)
  mySubmissions: () => ["me", "submissions"] as const,
} as const;

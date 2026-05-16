/**
 * Drizzle ORM schema — authoritative source for all table structures.
 * PostgreSQL with tsvector full-text search support.
 *
 * Phase A additions:
 *   - forms: submission_identity_mode, is_closed columns
 *   - submissions: identity/sponsorship/deletion columns
 *   - submission_sessions: two-phase sponsored submission correlation
 *   - form_branding: per-form visual customization
 *   - form_access_policies: time windows, passwords, response limits
 *   - form_allowlist: per-address submission access control
 */
import {
  pgTable,
  uuid,
  text,
  varchar,
  boolean,
  integer,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { customType } from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// Custom tsvector type for full-text search
// ---------------------------------------------------------------------------
const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector';
  },
});

// ---------------------------------------------------------------------------
// Forms
// ---------------------------------------------------------------------------
export const forms = pgTable(
  'forms',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ownerWallet: varchar('owner_wallet', { length: 255 }).notNull(),
    walrusBlobId: varchar('walrus_blob_id', { length: 255 }).notNull(),
    schemaVersion: integer('schema_version').notNull().default(1),
    suiObjectId: varchar('sui_object_id', { length: 255 }),
    isPrivate: boolean('is_private').notNull().default(false),
    isClosed: boolean('is_closed').notNull().default(false),
    isDeleted: boolean('is_deleted').notNull().default(false),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description'),
    denormalizedSchema: jsonb('denormalized_schema').notNull(),
    /**
     * Mirrors the Move contract's submission_identity_mode u8 constant.
     * Values: 'anonymous' | 'optional_connected' | 'required_connected'
     * Backfilled to 'required_connected' for all pre-existing forms.
     */
    submissionIdentityMode: varchar('submission_identity_mode', { length: 30 })
      .notNull()
      .default('required_connected'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index('idx_forms_owner_wallet').on(table.ownerWallet),
    index('idx_forms_is_deleted').on(table.isDeleted),
    index('idx_forms_identity_mode').on(table.submissionIdentityMode),
    check(
      'chk_forms_identity_mode',
      sql`${table.submissionIdentityMode} IN ('anonymous', 'optional_connected', 'required_connected')`
    ),
  ]
);

// ---------------------------------------------------------------------------
// Schema Versions
// ---------------------------------------------------------------------------
export const schemaVersions = pgTable(
  'schema_versions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    formId: uuid('form_id').notNull().references(() => forms.id, { onDelete: 'cascade' }),
    blobId: varchar('blob_id', { length: 255 }).notNull(),
    versionNumber: integer('version_number').notNull(),
    parentBlobId: varchar('parent_blob_id', { length: 255 }),
    suiObjectId: varchar('sui_object_id', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_schema_versions_form_id').on(table.formId),
    uniqueIndex('idx_schema_versions_form_version').on(table.formId, table.versionNumber),
  ]
);

// ---------------------------------------------------------------------------
// Submissions
// ---------------------------------------------------------------------------
export const submissions = pgTable(
  'submissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    formId: uuid('form_id').notNull().references(() => forms.id, { onDelete: 'cascade' }),
    walrusBlobId: varchar('walrus_blob_id', { length: 255 }).notNull(),
    suiObjectId: varchar('sui_object_id', { length: 255 }),
    isEncrypted: boolean('is_encrypted').notNull().default(false),
    submitterWallet: varchar('submitter_wallet', { length: 255 }),
    adminNotes: text('admin_notes'),
    priority: varchar('priority', { length: 20 }).notNull().default('medium'),
    isReviewed: boolean('is_reviewed').notNull().default(false),
    searchVector: tsvector('search_vector'),
    // --- Phase A additions ---
    /** Matches the form's identity mode at time of submission. */
    submissionIdentityMode: varchar('submission_identity_mode', { length: 30 })
      .notNull()
      .default('required_connected'),
    /** True when no wallet was connected and submitter_wallet is null. */
    isAnonymous: boolean('is_anonymous').notNull().default(false),
    /** True when the server wallet paid the gas on behalf of the submitter. */
    isSponsored: boolean('is_sponsored').notNull().default(false),
    /** The wallet address of the gas sponsor (server wallet address). */
    sponsorAddress: varchar('sponsor_address', { length: 255 }),
    /** Set true when the submitter has called request_deletion on-chain. */
    deletionRequested: boolean('deletion_requested').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index('idx_submissions_form_id').on(table.formId),
    index('idx_submissions_search_vector').using('gin', table.searchVector),
    index('idx_submissions_priority').on(table.priority),
    index('idx_submissions_is_reviewed').on(table.isReviewed),
    index('idx_submissions_is_anonymous').on(table.isAnonymous),
    check(
      'chk_submissions_identity_mode',
      sql`${table.submissionIdentityMode} IN ('anonymous', 'optional_connected', 'required_connected')`
    ),
  ]
);

// ---------------------------------------------------------------------------
// Submission Sessions (two-phase sponsored submission correlation)
// ---------------------------------------------------------------------------
export const submissionSessions = pgTable(
  'submission_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    formId: uuid('form_id').notNull().references(() => forms.id, { onDelete: 'cascade' }),
    /** Returned to client in phase 1, required in phase 2. */
    sessionToken: varchar('session_token', { length: 255 }).notNull().unique(),
    /** Base64-encoded sponsored transaction bytes awaiting client signature. */
    sponsoredTxBytes: text('sponsored_tx_bytes').notNull(),
    /** The submitter wallet that will sign in phase 2 (may be null for anonymous). */
    submitterWallet: varchar('submitter_wallet', { length: 255 }),
    /** Serialized submission content (validated in phase 1, committed in phase 2). */
    pendingSubmissionData: jsonb('pending_submission_data').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    /** TTL: 5 minutes from creation. Cleaned up by Inngest job. */
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_submission_sessions_form_id').on(table.formId),
    index('idx_submission_sessions_expires_at').on(table.expiresAt),
    check('chk_submission_sessions_status', sql`${table.status} IN ('pending', 'completed', 'expired')`),
  ]
);

// ---------------------------------------------------------------------------
// Upload Sessions
// ---------------------------------------------------------------------------
export const uploadSessions = pgTable(
  'upload_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionToken: varchar('session_token', { length: 255 }).notNull().unique(),
    formId: uuid('form_id').notNull().references(() => forms.id, { onDelete: 'cascade' }),
    allowedMimeTypes: jsonb('allowed_mime_types').notNull().$type<string[]>(),
    maxFileSize: integer('max_file_size').notNull(),
    uploadPurpose: varchar('upload_purpose', { length: 30 }).notNull().default('submission'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    isConsumed: boolean('is_consumed').notNull().default(false),
    resultBlobId: varchar('result_blob_id', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_upload_sessions_token').on(table.sessionToken),
    index('idx_upload_sessions_form_id').on(table.formId),
  ]
);

// ---------------------------------------------------------------------------
// Admins
// ---------------------------------------------------------------------------
export const admins = pgTable(
  'admins',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    formId: uuid('form_id').notNull().references(() => forms.id, { onDelete: 'cascade' }),
    walletAddress: varchar('wallet_address', { length: 255 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_admins_form_wallet').on(table.formId, table.walletAddress),
  ]
);

// ---------------------------------------------------------------------------
// Analyses (AI feedback analysis results)
// ---------------------------------------------------------------------------
export const analyses = pgTable(
  'analyses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    formId: uuid('form_id').notNull().references(() => forms.id, { onDelete: 'cascade' }),
    result: jsonb('result'),
    jobStatus: varchar('job_status', { length: 20 }).notNull().default('pending'),
    jobId: varchar('job_id', { length: 255 }),
    error: text('error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index('idx_analyses_form_id').on(table.formId),
  ]
);

// ---------------------------------------------------------------------------
// Export Jobs
// ---------------------------------------------------------------------------
export const exportJobs = pgTable(
  'export_jobs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    formId: uuid('form_id').notNull().references(() => forms.id, { onDelete: 'cascade' }),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    resultBlobId: varchar('result_blob_id', { length: 255 }),
    jobId: varchar('job_id', { length: 255 }),
    error: text('error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index('idx_export_jobs_form_id').on(table.formId),
  ]
);

// ---------------------------------------------------------------------------
// Form Branding (Change 2)
// ---------------------------------------------------------------------------

/** Safe font families allowed for form branding. Arbitrary fonts are rejected
 *  to prevent performance degradation and privacy fingerprinting risks. */
export const ALLOWED_FONT_FAMILIES = [
  'Inter', 'Roboto', 'Outfit', 'Space Grotesk', 'DM Sans', 'Lato',
  'Nunito', 'Open Sans', 'Poppins', 'Source Sans 3', 'Merriweather',
] as const;

export const formBranding = pgTable(
  'form_branding',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    /** One branding record per form. */
    formId: uuid('form_id').notNull().unique().references(() => forms.id, { onDelete: 'cascade' }),
    /** Walrus blob ID of the uploaded logo image. */
    logoWalrusBlobId: varchar('logo_walrus_blob_id', { length: 255 }),
    /** Hex accent color e.g. #6366f1. Validated by regex. */
    accentColor: varchar('accent_color', { length: 7 }),
    /** Hex background color. */
    backgroundColor: varchar('background_color', { length: 7 }),
    /** Font family from the ALLOWED_FONT_FAMILIES list. */
    fontFamily: varchar('font_family', { length: 50 }),
    /** Custom submit button text. Max 50 chars. */
    submitButtonText: varchar('submit_button_text', { length: 50 }),
    /** Thank-you message shown after submission. Max 500 chars. */
    thankYouMessage: varchar('thank_you_message', { length: 500 }),
    /** Whether to show the WalrusForms powered-by badge. Default true. */
    showWalrusFormsBranding: boolean('show_walrus_forms_branding').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  }
);

// ---------------------------------------------------------------------------
// Form Access Policies (Change 3)
// ---------------------------------------------------------------------------
export const formAccessPolicies = pgTable(
  'form_access_policies',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    /** One policy record per form. */
    formId: uuid('form_id').notNull().unique().references(() => forms.id, { onDelete: 'cascade' }),
    /** Whether submitters must be on the allowlist. */
    requiresAllowlist: boolean('requires_allowlist').notNull().default(false),
    /** Whether a response count cap is active. */
    hasResponseLimit: boolean('has_response_limit').notNull().default(false),
    /** Max submissions allowed. Null if hasResponseLimit is false. */
    responseLimit: integer('response_limit'),
    /** Form accepts submissions from this timestamp onward. */
    opensAt: timestamp('opens_at', { withTimezone: true }),
    /** Form stops accepting submissions after this timestamp. */
    closesAt: timestamp('closes_at', { withTimezone: true }),
    /**
     * SHA3-256 hash of the submission password, hex-encoded.
     * Never returned in API responses. Null means no password required.
     */
    passwordHash: varchar('password_hash', { length: 64 }),
    /** Sui object ID of the on-chain FormAccessPolicy object. */
    suiObjectId: varchar('sui_object_id', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  }
);

// ---------------------------------------------------------------------------
// Form Allowlist (Change 3)
// ---------------------------------------------------------------------------
export const formAllowlist = pgTable(
  'form_allowlist',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    formId: uuid('form_id').notNull().references(() => forms.id, { onDelete: 'cascade' }),
    /** Sui wallet address (0x-prefixed, lowercase). */
    allowedAddress: varchar('allowed_address', { length: 255 }).notNull(),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_form_allowlist_form_address').on(table.formId, table.allowedAddress),
    index('idx_form_allowlist_form_id').on(table.formId),
  ]
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------
export const formsRelations = relations(forms, ({ many, one }) => ({
  schemaVersions: many(schemaVersions),
  submissions: many(submissions),
  submissionSessions: many(submissionSessions),
  uploadSessions: many(uploadSessions),
  admins: many(admins),
  analyses: many(analyses),
  exportJobs: many(exportJobs),
  branding: one(formBranding, { fields: [forms.id], references: [formBranding.formId] }),
  accessPolicy: one(formAccessPolicies, { fields: [forms.id], references: [formAccessPolicies.formId] }),
  allowlist: many(formAllowlist),
  walrusBlobs: many(walrusBlobs),
  notificationPreferences: one(notificationPreferences, { fields: [forms.id], references: [notificationPreferences.formId] }),
  notificationLogs: many(notificationLogs),
  analyticsSnapshots: many(analyticsSnapshots),
  costEvents: many(costEvents),
}));

export const schemaVersionsRelations = relations(schemaVersions, ({ one }) => ({
  form: one(forms, { fields: [schemaVersions.formId], references: [forms.id] }),
}));

export const submissionsRelations = relations(submissions, ({ one }) => ({
  form: one(forms, { fields: [submissions.formId], references: [forms.id] }),
}));

export const submissionSessionsRelations = relations(submissionSessions, ({ one }) => ({
  form: one(forms, { fields: [submissionSessions.formId], references: [forms.id] }),
}));

export const uploadSessionsRelations = relations(uploadSessions, ({ one }) => ({
  form: one(forms, { fields: [uploadSessions.formId], references: [forms.id] }),
}));

export const adminsRelations = relations(admins, ({ one }) => ({
  form: one(forms, { fields: [admins.formId], references: [forms.id] }),
}));

export const analysesRelations = relations(analyses, ({ one }) => ({
  form: one(forms, { fields: [analyses.formId], references: [forms.id] }),
}));

export const exportJobsRelations = relations(exportJobs, ({ one }) => ({
  form: one(forms, { fields: [exportJobs.formId], references: [forms.id] }),
}));

export const formBrandingRelations = relations(formBranding, ({ one }) => ({
  form: one(forms, { fields: [formBranding.formId], references: [forms.id] }),
}));

export const formAccessPoliciesRelations = relations(formAccessPolicies, ({ one }) => ({
  form: one(forms, { fields: [formAccessPolicies.formId], references: [forms.id] }),
}));

export const formAllowlistRelations = relations(formAllowlist, ({ one }) => ({
  form: one(forms, { fields: [formAllowlist.formId], references: [forms.id] }),
}));

// ---------------------------------------------------------------------------
// Walrus Blobs (Phase B)
// ---------------------------------------------------------------------------
export const walrusBlobs = pgTable(
  'walrus_blobs',
  {
    id: varchar('id', { length: 255 }).primaryKey(), // The Walrus Blob ID
    formId: uuid('form_id').references(() => forms.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 50 }).notNull(), // 'schema', 'submission', 'branding_logo'
    sizeBytes: integer('size_bytes'),
    epochs: integer('epochs').notNull(),
    expiresAtEpoch: integer('expires_at_epoch').notNull(),
    status: varchar('status', { length: 50 }).notNull().default('active'), // 'active', 'expiring_soon', 'expired'
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index('idx_walrus_blobs_form_id').on(table.formId),
    index('idx_walrus_blobs_expires_at').on(table.expiresAtEpoch),
    index('idx_walrus_blobs_status').on(table.status),
  ]
);

export const walrusBlobsRelations = relations(walrusBlobs, ({ one }) => ({
  form: one(forms, { fields: [walrusBlobs.formId], references: [forms.id] }),
}));

// ---------------------------------------------------------------------------
// Notification Preferences (Phase B)
// ---------------------------------------------------------------------------
export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    formId: uuid('form_id').notNull().unique().references(() => forms.id, { onDelete: 'cascade' }),
    emailAddresses: jsonb('email_addresses').notNull().$type<string[]>().default([]),
    discordWebhookUrl: varchar('discord_webhook_url', { length: 500 }),
    customWebhookUrl: varchar('custom_webhook_url', { length: 500 }),
    customWebhookSecret: varchar('custom_webhook_secret', { length: 255 }),
    /** 'immediate', 'hourly', 'daily' */
    frequency: varchar('frequency', { length: 20 }).notNull().default('immediate'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  }
);

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  form: one(forms, { fields: [notificationPreferences.formId], references: [forms.id] }),
}));

// ---------------------------------------------------------------------------
// Notification Logs (Phase B)
// ---------------------------------------------------------------------------
export const notificationLogs = pgTable(
  'notification_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    formId: uuid('form_id').notNull().references(() => forms.id, { onDelete: 'cascade' }),
    channel: varchar('channel', { length: 30 }).notNull(), // 'email', 'discord', 'webhook'
    type: varchar('type', { length: 30 }).notNull(), // 'submission', 'digest', 'alert'
    status: varchar('status', { length: 30 }).notNull(), // 'success', 'failed'
    dispatchedAt: timestamp('dispatched_at', { withTimezone: true }).notNull().defaultNow(),
    errorDetails: text('error_details'),
    recipient: text('recipient'), // email address, webhook URL, etc (masked if needed)
  },
  (table) => [
    index('idx_notification_logs_form_id').on(table.formId),
    index('idx_notification_logs_dispatched_at').on(table.dispatchedAt),
  ]
);

export const notificationLogsRelations = relations(notificationLogs, ({ one }) => ({
  form: one(forms, { fields: [notificationLogs.formId], references: [forms.id] }),
}));

// ---------------------------------------------------------------------------
// Analytics Snapshots (Phase B)
// ---------------------------------------------------------------------------
export const analyticsSnapshots = pgTable(
  'analytics_snapshots',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    formId: uuid('form_id').notNull().references(() => forms.id, { onDelete: 'cascade' }),
    /** The date/hour this snapshot represents */
    periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
    /** e.g. 'daily', 'hourly' */
    resolution: varchar('resolution', { length: 20 }).notNull(),
    totalSubmissions: integer('total_submissions').notNull().default(0),
    anonymousSubmissions: integer('anonymous_submissions').notNull().default(0),
    sponsoredSubmissions: integer('sponsored_submissions').notNull().default(0),
    selfPaidSubmissions: integer('self_paid_submissions').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_analytics_snapshots_form_period').on(table.formId, table.resolution, table.periodStart),
    index('idx_analytics_snapshots_form_id').on(table.formId),
  ]
);

export const analyticsSnapshotsRelations = relations(analyticsSnapshots, ({ one }) => ({
  form: one(forms, { fields: [analyticsSnapshots.formId], references: [forms.id] }),
}));

// ---------------------------------------------------------------------------
// Platform Accounts (Phase C)
// ---------------------------------------------------------------------------
export const platformAccounts = pgTable(
  'platform_accounts',
  {
    walletAddress: varchar('wallet_address', { length: 255 }).primaryKey(),
    /** Credits available for covering gas/storage */
    availableCredits: integer('available_credits').notNull().default(0),
    /** Total credits ever spent */
    totalSpent: integer('total_spent').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  }
);

// ---------------------------------------------------------------------------
// Cost Events (Phase C)
// ---------------------------------------------------------------------------
export const costEvents = pgTable(
  'cost_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    walletAddress: varchar('wallet_address', { length: 255 }).notNull().references(() => platformAccounts.walletAddress, { onDelete: 'cascade' }),
    formId: uuid('form_id').references(() => forms.id, { onDelete: 'set null' }),
    /** 'submission_sponsored' | 'storage_renewal' | 'deposit' */
    type: varchar('type', { length: 30 }).notNull(),
    amount: integer('amount').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_cost_events_wallet').on(table.walletAddress),
    index('idx_cost_events_form_id').on(table.formId),
    index('idx_cost_events_created_at').on(table.createdAt),
  ]
);

export const platformAccountsRelations = relations(platformAccounts, ({ many }) => ({
  costEvents: many(costEvents),
}));

export const costEventsRelations = relations(costEvents, ({ one }) => ({
  account: one(platformAccounts, { fields: [costEvents.walletAddress], references: [platformAccounts.walletAddress] }),
  form: one(forms, { fields: [costEvents.formId], references: [forms.id] }),
}));

// Re-export the sql helper for tsvector queries
export { sql };

/// Module: walrus_forms::errors
///
/// Centralised error constants for the entire `walrus_forms` package.
/// Every `abort` across every module MUST reference a named constant
/// from this module — raw integer abort codes are strictly forbidden.
///
/// Constants are referenced via accessor functions by business-logic
/// modules, and directly by name (e.g., `walrus_forms::errors::EFormClosed`)
/// in `#[expected_failure]` test annotations.
module walrus_forms::errors;

// ─── Authorisation ──────────────────────────────────────────────────────

/// The caller does not hold the required capability object.
const EUnauthorized: u64 = 1;

/// Cap's form_id ≠ target Form's ID (capability confusion attack).
const EFormIdMismatch: u64 = 2;

/// AdminCap's form_id ≠ FormOwnerCap's form_id during revocation.
const EAdminCapFormMismatch: u64 = 6;

/// The AdminCap has been revoked by the form owner.
const ECapRevoked: u64 = 9;

// ─── Form State ─────────────────────────────────────────────────────────

/// Submission to a closed form.
const EFormClosed: u64 = 3;

/// close_form called on an already-closed form.
const EFormAlreadyClosed: u64 = 10;

/// reopen_form called on an already-open form.
const EFormAlreadyOpen: u64 = 11;

// ─── Data Validation ────────────────────────────────────────────────────

/// Walrus blob ID is not exactly 32 bytes.
const EInvalidBlobIdLength: u64 = 4;

/// Schema version mismatch.
const ESchemaVersionMismatch: u64 = 5;

/// Invalid form field configuration (reserved for future use).
const EInvalidFieldConfig: u64 = 8;

// ─── Submission Identity ─────────────────────────────────────────────────

/// submission_identity_mode u8 value is not one of {0, 1, 2}.
const EInvalidIdentityMode: u64 = 12;

/// Sender address does not match the required submitter identity.
const EIdentityMismatch: u64 = 13;

/// Sender is not the original submitter on the SubmissionReceipt.
const ENotSubmitter: u64 = 21;

// ─── Access Control ──────────────────────────────────────────────────────

/// Submission epoch is outside the form's opens_at / closes_at window.
const EFormNotInWindow: u64 = 14;

/// Submission count has reached or exceeded the form's response limit.
const EResponseLimitReached: u64 = 15;

/// Provided password hash does not match the policy's stored hash.
const EPasswordMismatch: u64 = 16;

/// FormAccessPolicy.form_id ≠ FormOwnerCap.form_id.
const EAccessPolicyCapMismatch: u64 = 23;

// ─── Branding ────────────────────────────────────────────────────────────

/// asset_type u8 value is not one of {0, 1, 2}.
const EInvalidAssetType: u64 = 17;

/// mime_type_hint string is not in the known-safe set.
const EInvalidMimeType: u64 = 18;

/// BrandingAsset.form_id ≠ FormOwnerCap.form_id.
const EBrandingCapMismatch: u64 = 22;

// ─── Sponsorship ─────────────────────────────────────────────────────────

/// SponsorshipPool.is_active == false.
const ESponsorshipInactive: u64 = 19;

/// Provided sponsor_address ≠ SponsorshipPool.sponsor_address.
const ESponsorMismatch: u64 = 20;

// ─── Accessor functions for cross-module use ────────────────────────────

public fun unauthorized(): u64 { EUnauthorized }
public fun form_id_mismatch(): u64 { EFormIdMismatch }
public fun form_closed(): u64 { EFormClosed }
public fun invalid_blob_id_length(): u64 { EInvalidBlobIdLength }
public fun schema_version_mismatch(): u64 { ESchemaVersionMismatch }
public fun admin_cap_form_mismatch(): u64 { EAdminCapFormMismatch }
public fun invalid_field_config(): u64 { EInvalidFieldConfig }
public fun cap_revoked(): u64 { ECapRevoked }
public fun form_already_closed(): u64 { EFormAlreadyClosed }
public fun form_already_open(): u64 { EFormAlreadyOpen }
public fun invalid_identity_mode(): u64 { EInvalidIdentityMode }
public fun identity_mismatch(): u64 { EIdentityMismatch }
public fun not_submitter(): u64 { ENotSubmitter }
public fun form_not_in_window(): u64 { EFormNotInWindow }
public fun response_limit_reached(): u64 { EResponseLimitReached }
public fun password_mismatch(): u64 { EPasswordMismatch }
public fun access_policy_cap_mismatch(): u64 { EAccessPolicyCapMismatch }
public fun invalid_asset_type(): u64 { EInvalidAssetType }
public fun invalid_mime_type(): u64 { EInvalidMimeType }
public fun branding_cap_mismatch(): u64 { EBrandingCapMismatch }
public fun sponsorship_inactive(): u64 { ESponsorshipInactive }
public fun sponsor_mismatch(): u64 { ESponsorMismatch }

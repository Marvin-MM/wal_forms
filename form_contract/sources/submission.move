/// Module: walrus_forms::submission
///
/// Defines `SubmissionReceipt` and the full set of submission entry functions.
/// The hot path is optimised for gas efficiency — closed-form check is first.
///
/// ## Submission Pathways
///
/// 1. `submit` — wallet-connected, required identity. Submitter pays gas.
///    Use when Form.submission_identity_mode == 2 (IDENTITY_REQUIRED_CONNECTED).
///
/// 2. `submit_anonymous` — anonymous or optional-connected, server-sponsored.
///    Requires a `SponsorshipPool` reference for sponsor validation.
///    Use when Form.submission_identity_mode == 0 (anonymous) or 1 (optional).
///
/// 3. `submit_with_policy` — like `submit` but with time window + password checks.
///
/// 4. `submit_anonymous_with_policy` — like `submit_anonymous` but with policy checks.
///
/// ## Data Portability
///
/// `request_deletion` allows the original submitter (for wallet-connected
/// submissions) to create an on-chain `DeletionRequest` signal. The on-chain
/// blob ID reference is permanent — the deletion request is a signal only,
/// honoured at the application layer by the backend.
///
/// ## Breaking Changes (v2)
///
/// - `SubmissionReceipt.submitter` changed from `address` to `Option<address>`.
/// - New fields on SubmissionReceipt: `identity_mode`, `is_sponsored`,
///   `form_owner_at_submission`.
/// - `submitter()` accessor now returns `Option<address>`.
/// See MIGRATION.md for full details.
///
/// ## Ownership
///
/// - `SubmissionReceipt` → owned by `ctx.sender()` (may be the sponsor wallet
///   for anonymous submissions).
/// - `DeletionRequest` → owned by the form owner at submission time.
module walrus_forms::submission;

use sui::event;
use walrus_forms::access::{Self, FormAccessPolicy};
use walrus_forms::form::{Self, Form};
use walrus_forms::sponsorship::{Self, SponsorshipPool};

// ─── Constants ──────────────────────────────────────────────────────────

const BLOB_ID_LENGTH: u64 = 32;

/// Submitters are not identified. Receipt submitter = none.
const IDENTITY_ANONYMOUS: u8 = 0;

/// Submitter wallet address is recorded if provided by the backend.
const IDENTITY_OPTIONAL_CONNECTED: u8 = 1;

/// Submitter must sign the transaction. Receipt submitter = some(sender).
const IDENTITY_REQUIRED_CONNECTED: u8 = 2;

// Error constants — values kept in sync with walrus_forms::errors
const EFormClosed: u64 = 3;
const EInvalidBlobIdLength: u64 = 4;
const EFormIdMismatch: u64 = 2;
const EInvalidIdentityMode: u64 = 12;
const ENotSubmitter: u64 = 21;
// These constants mirror the access module's abort codes.
// They exist here so test annotations can reference them via
// `walrus_forms::submission::E*` in `#[expected_failure]` blocks when
// `submit_with_policy` is the call site that triggers the abort chain.
#[allow(unused_const)]
const EFormNotInWindow: u64 = 14;
#[allow(unused_const)]
const EPasswordMismatch: u64 = 16;

// ─── Events ─────────────────────────────────────────────────────────────

/// Emitted for every successful submission regardless of pathway.
public struct SubmissionReceived has copy, drop {
    form_id: ID,
    receipt_id: ID,
    blob_id: vector<u8>,
    /// None for anonymous submissions, Some(address) for connected.
    submitter: Option<address>,
    schema_version: u64,
    is_encrypted: bool,
    /// The identity mode that was active on the Form at submission time.
    identity_mode: u8,
    /// True when ctx.sender() ≠ the provided sponsor_address.
    is_sponsored: bool,
}

/// Emitted when a submitter requests deletion of their submission record.
public struct DeletionRequested has copy, drop {
    receipt_id: ID,
    form_id: ID,
    /// The address that requested deletion.
    requester: address,
    /// The form owner address the DeletionRequest was routed to.
    form_owner: address,
}

// ─── Objects ─────────────────────────────────────────────────────────────

/// Verifiable receipt proving a submission was made to a form.
///
/// Records the schema version at submission time and the identity context
/// for auditability. Owned by `ctx.sender()` at submission time — which
/// may be the backend sponsor wallet for anonymous submissions.
///
/// ## Breaking Change (v2)
///
/// The `submitter` field changed from `address` to `Option<address>`.
/// Three new fields were added: `identity_mode`, `is_sponsored`,
/// `form_owner_at_submission`. See MIGRATION.md.
public struct SubmissionReceipt has key {
    id: UID,
    form_id: ID,
    blob_id: vector<u8>,
    is_encrypted: bool,
    /// None for fully anonymous submissions. Some(address) for wallet-connected.
    submitter: Option<address>,
    /// The identity mode active on the Form at the time of submission.
    identity_mode: u8,
    /// True if ctx.sender() ≠ the sponsor_address (server paid gas).
    is_sponsored: bool,
    /// The form owner's address at submission time, used to route
    /// DeletionRequest objects without querying the live Form.
    form_owner_at_submission: address,
    schema_version_at_submission: u64,
    created_at: u64,
}

/// An on-chain signal that a submitter has requested deletion of their
/// submission record at the application layer.
///
/// ## Important: No On-Chain Deletion
///
/// This object does NOT delete any data on-chain. The blob ID reference
/// in the SubmissionReceipt is permanent. This is a signal only. The
/// backend indexes `DeletionRequested` events and marks the corresponding
/// Postgres record as deletion-requested, removing it from admin queries
/// and preventing further content serving.
///
/// ## Ownership
///
/// Transferred to `form_owner_at_submission` so it appears in the form
/// owner's owned objects and the backend can index it.
public struct DeletionRequest has key {
    id: UID,
    /// The SubmissionReceipt this deletion request references.
    receipt_id: ID,
    form_id: ID,
    requested_by: address,
    requested_at: u64,
}

// ─── Entry Functions ─────────────────────────────────────────────────────

/// Submit a response to a form. Callable by any wallet-connected address.
///
/// Sets identity mode to IDENTITY_REQUIRED_CONNECTED and records the
/// transaction sender as the submitter. The form's submission_identity_mode
/// is not validated here — this function is always available for direct
/// wallet-connected submissions (backward compatible).
///
/// ## Aborts
/// - `EFormClosed` if the form is closed.
/// - `EInvalidBlobIdLength` if blob_id is not 32 bytes.
entry fun submit(
    form: &mut Form,
    blob_id: vector<u8>,
    is_encrypted: bool,
    ctx: &mut TxContext,
) {
    assert!(!form::is_closed(form), EFormClosed);
    assert!(blob_id.length() == BLOB_ID_LENGTH, EInvalidBlobIdLength);

    let sender = ctx.sender();
    let form_id = form::id(form);
    let schema_version = form::schema_version(form);
    let form_owner = form::owner(form);

    form::increment_submission_count(form);

    let receipt = SubmissionReceipt {
        id: object::new(ctx),
        form_id,
        blob_id,
        is_encrypted,
        submitter: option::some(sender),
        identity_mode: IDENTITY_REQUIRED_CONNECTED,
        is_sponsored: false,
        form_owner_at_submission: form_owner,
        schema_version_at_submission: schema_version,
        created_at: ctx.epoch(),
    };

    let receipt_id = receipt.id.to_inner();

    event::emit(SubmissionReceived {
        form_id,
        receipt_id,
        blob_id: receipt.blob_id,
        submitter: option::some(sender),
        schema_version,
        is_encrypted,
        identity_mode: IDENTITY_REQUIRED_CONNECTED,
        is_sponsored: false,
    });

    transfer::transfer(receipt, sender);
}

/// Submit anonymously or with optional identity, using a server-sponsored transaction.
///
/// Used when Form.submission_identity_mode is 0 (ANONYMOUS) or 1 (OPTIONAL_CONNECTED).
/// The SponsorshipPool is validated to ensure the sponsor_address is authorised
/// and the pool is active.
///
/// The SubmissionReceipt is transferred to `ctx.sender()` — the backend sponsor
/// wallet — not to an anonymous submitter (who has no wallet in this context).
///
/// ## Parameters
/// - `form`: Mutable reference to the Form.
/// - `blob_id`: 32-byte Walrus blob ID of the submission content.
/// - `is_encrypted`: Whether the content is encrypted via Seal.
/// - `submitter_address`: Optional wallet address of the human submitter.
///   Recorded when identity mode is OPTIONAL_CONNECTED (1) and address provided.
///   Ignored (set to none) when identity mode is ANONYMOUS (0).
/// - `sponsor_address`: The backend server wallet address.
///   Used to compute `is_sponsored` and validated against the pool.
/// - `pool`: The SponsorshipPool authorising this sponsor wallet for this form.
/// - `ctx`: Transaction context.
///
/// ## Aborts
/// - `EFormClosed` if the form is closed.
/// - `EInvalidBlobIdLength` if blob_id is not 32 bytes.
/// - `EInvalidIdentityMode` if the form's mode is not 0 or 1.
/// - `ESponsorshipInactive` if the pool is not active.
/// - `ESponsorMismatch` if sponsor_address ≠ pool.sponsor_address.
entry fun submit_anonymous(
    form: &mut Form,
    blob_id: vector<u8>,
    is_encrypted: bool,
    submitter_address: Option<address>,
    sponsor_address: address,
    pool: &SponsorshipPool,
    ctx: &mut TxContext,
) {
    assert!(!form::is_closed(form), EFormClosed);
    assert!(blob_id.length() == BLOB_ID_LENGTH, EInvalidBlobIdLength);

    let identity_mode = form::submission_identity_mode(form);
    assert!(
        identity_mode == IDENTITY_ANONYMOUS || identity_mode == IDENTITY_OPTIONAL_CONNECTED,
        EInvalidIdentityMode,
    );

    // Validate sponsorship pool
    sponsorship::verify_sponsorship(pool, sponsor_address);

    let sender = ctx.sender();
    // is_sponsored = true when the transaction sender is acting as the sponsor
    // (i.e. the backend wallet signed and paid for this tx on behalf of a user)
    let is_sponsored = sender != sponsor_address;

    // Determine recorded submitter based on mode
    let submitter = if (identity_mode == IDENTITY_ANONYMOUS) {
        option::none<address>()
    } else {
        // IDENTITY_OPTIONAL_CONNECTED — use provided address if any
        submitter_address
    };

    let form_id = form::id(form);
    let schema_version = form::schema_version(form);
    let form_owner = form::owner(form);

    form::increment_submission_count(form);

    let receipt = SubmissionReceipt {
        id: object::new(ctx),
        form_id,
        blob_id,
        is_encrypted,
        submitter,
        identity_mode,
        is_sponsored,
        form_owner_at_submission: form_owner,
        schema_version_at_submission: schema_version,
        created_at: ctx.epoch(),
    };

    let receipt_id = receipt.id.to_inner();

    event::emit(SubmissionReceived {
        form_id,
        receipt_id,
        blob_id: receipt.blob_id,
        submitter,
        schema_version,
        is_encrypted,
        identity_mode,
        is_sponsored,
    });

    // Transfer to sender (the sponsor/backend wallet for anonymous submissions)
    transfer::transfer(receipt, sender);
}

/// Submit with access policy enforcement (time window + password check).
///
/// Performs all checks from `submit` plus validates the submission is
/// within the policy's time window and the password hash matches (if set).
/// The policy's form_id is validated against the form.
///
/// ## Aborts
/// - `EFormClosed`, `EInvalidBlobIdLength` (same as submit).
/// - `EFormIdMismatch` if policy.form_id ≠ form.id.
/// - `EFormNotInWindow` if current epoch is outside opens_at / closes_at.
/// - `EPasswordMismatch` if the policy has a password and the hash doesn't match.
entry fun submit_with_policy(
    form: &mut Form,
    policy: &FormAccessPolicy,
    blob_id: vector<u8>,
    is_encrypted: bool,
    password_hash: Option<vector<u8>>,
    ctx: &mut TxContext,
) {
    assert!(!form::is_closed(form), EFormClosed);
    assert!(blob_id.length() == BLOB_ID_LENGTH, EInvalidBlobIdLength);
    assert!(access::policy_form_id(policy) == form::id(form), EFormIdMismatch);

    access::verify_submission_window(policy, ctx.epoch());
    access::verify_password(policy, password_hash);

    let sender = ctx.sender();
    let form_id = form::id(form);
    let schema_version = form::schema_version(form);
    let form_owner = form::owner(form);

    form::increment_submission_count(form);

    let receipt = SubmissionReceipt {
        id: object::new(ctx),
        form_id,
        blob_id,
        is_encrypted,
        submitter: option::some(sender),
        identity_mode: IDENTITY_REQUIRED_CONNECTED,
        is_sponsored: false,
        form_owner_at_submission: form_owner,
        schema_version_at_submission: schema_version,
        created_at: ctx.epoch(),
    };

    let receipt_id = receipt.id.to_inner();

    event::emit(SubmissionReceived {
        form_id,
        receipt_id,
        blob_id: receipt.blob_id,
        submitter: option::some(sender),
        schema_version,
        is_encrypted,
        identity_mode: IDENTITY_REQUIRED_CONNECTED,
        is_sponsored: false,
    });

    transfer::transfer(receipt, sender);
}

/// Submit anonymously with access policy enforcement.
///
/// Combines the identity and sponsorship logic of `submit_anonymous` with
/// the time window and password checks of `submit_with_policy`.
///
/// ## Aborts
/// - All aborts from `submit_anonymous`.
/// - `EFormIdMismatch` if policy.form_id ≠ form.id.
/// - `EFormNotInWindow` if outside time window.
/// - `EPasswordMismatch` if password hash doesn't match.
entry fun submit_anonymous_with_policy(
    form: &mut Form,
    policy: &FormAccessPolicy,
    blob_id: vector<u8>,
    is_encrypted: bool,
    submitter_address: Option<address>,
    sponsor_address: address,
    pool: &SponsorshipPool,
    password_hash: Option<vector<u8>>,
    ctx: &mut TxContext,
) {
    assert!(!form::is_closed(form), EFormClosed);
    assert!(blob_id.length() == BLOB_ID_LENGTH, EInvalidBlobIdLength);
    assert!(access::policy_form_id(policy) == form::id(form), EFormIdMismatch);

    let identity_mode = form::submission_identity_mode(form);
    assert!(
        identity_mode == IDENTITY_ANONYMOUS || identity_mode == IDENTITY_OPTIONAL_CONNECTED,
        EInvalidIdentityMode,
    );

    access::verify_submission_window(policy, ctx.epoch());
    access::verify_password(policy, password_hash);
    sponsorship::verify_sponsorship(pool, sponsor_address);

    let sender = ctx.sender();
    let is_sponsored = sender != sponsor_address;

    let submitter = if (identity_mode == IDENTITY_ANONYMOUS) {
        option::none<address>()
    } else {
        submitter_address
    };

    let form_id = form::id(form);
    let schema_version = form::schema_version(form);
    let form_owner = form::owner(form);

    form::increment_submission_count(form);

    let receipt = SubmissionReceipt {
        id: object::new(ctx),
        form_id,
        blob_id,
        is_encrypted,
        submitter,
        identity_mode,
        is_sponsored,
        form_owner_at_submission: form_owner,
        schema_version_at_submission: schema_version,
        created_at: ctx.epoch(),
    };

    let receipt_id = receipt.id.to_inner();

    event::emit(SubmissionReceived {
        form_id,
        receipt_id,
        blob_id: receipt.blob_id,
        submitter,
        schema_version,
        is_encrypted,
        identity_mode,
        is_sponsored,
    });

    transfer::transfer(receipt, sender);
}

/// Signals a deletion request for a wallet-connected submission.
///
/// Only the original submitter can call this function. Creates a
/// `DeletionRequest` object transferred to the form owner's address at
/// the time of submission. The on-chain blob ID reference is permanent —
/// this is a signal only (see DeletionRequest docs).
///
/// ## Aborts
/// - `ENotSubmitter` if receipt.submitter is none (anonymous submissions
///   cannot request deletion — no identity to assert ownership).
/// - `ENotSubmitter` if ctx.sender() ≠ the recorded submitter address.
entry fun request_deletion(
    receipt: &SubmissionReceipt,
    ctx: &mut TxContext,
) {
    let sender = ctx.sender();

    // Anonymous submissions have no identity — cannot request deletion
    assert!(receipt.submitter.is_some(), ENotSubmitter);
    assert!(*receipt.submitter.borrow() == sender, ENotSubmitter);

    let deletion_request = DeletionRequest {
        id: object::new(ctx),
        receipt_id: receipt.id.to_inner(),
        form_id: receipt.form_id,
        requested_by: sender,
        requested_at: ctx.epoch(),
    };

    event::emit(DeletionRequested {
        receipt_id: receipt.id.to_inner(),
        form_id: receipt.form_id,
        requester: sender,
        form_owner: receipt.form_owner_at_submission,
    });

    // Route to the form owner so it appears in their owned objects
    transfer::transfer(deletion_request, receipt.form_owner_at_submission);
}

// ─── Accessors ──────────────────────────────────────────────────────────

public fun form_id(self: &SubmissionReceipt): ID { self.form_id }
public fun blob_id(self: &SubmissionReceipt): vector<u8> { self.blob_id }
public fun is_encrypted(self: &SubmissionReceipt): bool { self.is_encrypted }
/// Returns the optional submitter address. None for anonymous submissions.
public fun submitter(self: &SubmissionReceipt): Option<address> { self.submitter }
public fun identity_mode(self: &SubmissionReceipt): u8 { self.identity_mode }
public fun is_sponsored(self: &SubmissionReceipt): bool { self.is_sponsored }
public fun form_owner_at_submission(self: &SubmissionReceipt): address { self.form_owner_at_submission }
public fun schema_version_at_submission(self: &SubmissionReceipt): u64 { self.schema_version_at_submission }
public fun created_at(self: &SubmissionReceipt): u64 { self.created_at }
public fun deletion_request_form_id(self: &DeletionRequest): ID { self.form_id }
public fun deletion_request_receipt_id(self: &DeletionRequest): ID { self.receipt_id }
public fun requested_by(self: &DeletionRequest): address { self.requested_by }

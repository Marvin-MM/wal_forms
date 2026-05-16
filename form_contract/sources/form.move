/// Module: walrus_forms::form
///
/// Defines the `Form` shared object and the `FormOwnerCap` capability
/// object. The Form is the central registry entry — it stores only
/// small, bounded metadata and cryptographic references to Walrus
/// content. It is NOT a database; all content lives on Walrus.
///
/// ## Change 1 — Breaking Change
///
/// The `create` entry function now accepts `submission_identity_mode: u8`
/// as a required parameter. See `MIGRATION.md` for update instructions.
///
/// ## Submission Identity Modes
///
/// - 0 (`IDENTITY_ANONYMOUS`): Submitters are not identified. Used with
///   `submission::submit_anonymous` and a SponsorshipPool.
/// - 1 (`IDENTITY_OPTIONAL_CONNECTED`): Submitter wallet address is
///   recorded if provided, otherwise anonymous. Used with `submit_anonymous`.
/// - 2 (`IDENTITY_REQUIRED_CONNECTED`): Submitter must sign the transaction
///   themselves. Used with `submission::submit`.
///
/// ## Ownership Semantics
///
/// - **Form** is a **shared object** so any address can submit.
/// - **FormOwnerCap** is an **owned object** with `key` only (non-transferable).
///
/// ## Deletion Policy
///
/// Form objects cannot be safely deleted once shared. `close_form` is
/// the logical archive operation.
module walrus_forms::form;

use sui::event;
use walrus_forms::schema_version;

// ─── Constants ──────────────────────────────────────────────────────────

const BLOB_ID_LENGTH: u64 = 32;

// Error constants — values kept in sync with walrus_forms::errors
const EFormIdMismatch: u64 = 2;
const EInvalidBlobIdLength: u64 = 4;
const EFormAlreadyClosed: u64 = 10;
const EFormAlreadyOpen: u64 = 11;
const EInvalidIdentityMode: u64 = 12;

// ─── Event Definitions ─────────────────────────────────────────────────

/// Emitted when a new Form is created and shared.
public struct FormCreated has copy, drop {
    form_id: ID,
    owner: address,
    schema_blob_id: vector<u8>,
    is_private: bool,
    schema_version: u64,
    submission_identity_mode: u8,
}

/// Emitted when a form's schema is updated to a new version.
public struct SchemaUpdated has copy, drop {
    form_id: ID,
    old_blob_id: vector<u8>,
    new_blob_id: vector<u8>,
    new_version: u64,
    updater: address,
}

/// Emitted when a form is closed (stops accepting submissions).
public struct FormClosed has copy, drop {
    form_id: ID,
    closed_by: address,
}

/// Emitted when a closed form is reopened.
public struct FormReopened has copy, drop {
    form_id: ID,
    reopened_by: address,
}

/// Emitted when the submission identity mode is updated.
public struct FormIdentityModeUpdated has copy, drop {
    form_id: ID,
    old_mode: u8,
    new_mode: u8,
    updated_by: address,
}

// ─── Object Definitions ────────────────────────────────────────────────

/// A verifiable on-chain registry entry for a form.
///
/// The Form is shared so that anyone can submit to it. It stores only
/// cryptographic references and small metadata — all content lives on Walrus.
///
/// ## submission_identity_mode
///
/// Controls how submission identity is handled:
/// - 0: Anonymous — no submitter identity recorded.
/// - 1: Optional connected — wallet address recorded if provided.
/// - 2: Required connected — submitter must sign the transaction.
///
/// This field can be updated post-creation via `update_identity_mode`.
public struct Form has key {
    id: UID,
    owner: address,
    schema_blob_id: vector<u8>,
    schema_version: u64,
    is_private: bool,
    is_closed: bool,
    submission_count: u64,
    created_at: u64,
    /// Governs which submission pathway is used. One of {0, 1, 2}.
    submission_identity_mode: u8,
}

/// Proof of ownership for a specific Form. Non-transferable (key only).
public struct FormOwnerCap has key {
    id: UID,
    form_id: ID,
}

// ─── Validation Helpers ─────────────────────────────────────────────────

/// Validates that a submission identity mode value is one of {0, 1, 2}.
fun validate_identity_mode(mode: u8) {
    assert!(mode == 0 || mode == 1 || mode == 2, EInvalidIdentityMode);
}

// ─── Entry Functions ────────────────────────────────────────────────────

/// Creates a new Form (shared), FormOwnerCap (to sender), and SchemaVersion v0.
///
/// ## Parameters
/// - `schema_blob_id`: 32-byte Walrus blob ID of the initial schema.
/// - `is_private`: Whether submissions are encrypted via Seal.
/// - `submission_identity_mode`: Identity mode — 0 (anonymous), 1 (optional), 2 (required).
/// - `ctx`: Transaction context.
///
/// ## Aborts
/// - `EInvalidBlobIdLength` if schema_blob_id is not 32 bytes.
/// - `EInvalidIdentityMode` if submission_identity_mode ∉ {0, 1, 2}.
///
/// ## Breaking Change (v2)
///
/// This function signature changed from v1. See MIGRATION.md.
entry fun create(
    schema_blob_id: vector<u8>,
    is_private: bool,
    submission_identity_mode: u8,
    ctx: &mut TxContext,
) {
    assert!(schema_blob_id.length() == BLOB_ID_LENGTH, EInvalidBlobIdLength);
    validate_identity_mode(submission_identity_mode);

    let sender = ctx.sender();

    let form = Form {
        id: object::new(ctx),
        owner: sender,
        schema_blob_id,
        schema_version: 0,
        is_private,
        is_closed: false,
        submission_count: 0,
        created_at: ctx.epoch(),
        submission_identity_mode,
    };

    let form_id = form.id.to_inner();

    let owner_cap = FormOwnerCap {
        id: object::new(ctx),
        form_id,
    };

    event::emit(FormCreated {
        form_id,
        owner: sender,
        schema_blob_id: form.schema_blob_id,
        is_private,
        schema_version: 0,
        submission_identity_mode,
    });

    schema_version::create(
        form_id,
        form.schema_blob_id,
        0,
        option::none(),
        sender,
        ctx,
    );

    transfer::share_object(form);
    transfer::transfer(owner_cap, sender);
}

/// Updates the form's schema to a new Walrus blob ID.
///
/// ## Aborts
/// - `EFormIdMismatch` if owner_cap.form_id ≠ form.id.
/// - `EInvalidBlobIdLength` if new_schema_blob_id is not 32 bytes.
entry fun update_schema(
    form: &mut Form,
    owner_cap: &FormOwnerCap,
    new_schema_blob_id: vector<u8>,
    ctx: &mut TxContext,
) {
    verify_owner_cap(owner_cap, form);
    assert!(new_schema_blob_id.length() == BLOB_ID_LENGTH, EInvalidBlobIdLength);

    let old_blob_id = form.schema_blob_id;
    let form_id = form.id.to_inner();

    form.schema_version = form.schema_version + 1;
    form.schema_blob_id = new_schema_blob_id;

    schema_version::create(
        form_id,
        new_schema_blob_id,
        form.schema_version,
        option::some(old_blob_id),
        ctx.sender(),
        ctx,
    );

    event::emit(SchemaUpdated {
        form_id,
        old_blob_id,
        new_blob_id: new_schema_blob_id,
        new_version: form.schema_version,
        updater: ctx.sender(),
    });
}

/// Closes the form, preventing any new submissions.
///
/// ## Aborts
/// - `EFormIdMismatch` if cap doesn't match form.
/// - `EFormAlreadyClosed` if form is already closed.
entry fun close_form(
    form: &mut Form,
    owner_cap: &FormOwnerCap,
    ctx: &TxContext,
) {
    verify_owner_cap(owner_cap, form);
    assert!(!form.is_closed, EFormAlreadyClosed);

    form.is_closed = true;

    event::emit(FormClosed {
        form_id: form.id.to_inner(),
        closed_by: ctx.sender(),
    });
}

/// Reopens a closed form.
///
/// ## Aborts
/// - `EFormIdMismatch` if cap doesn't match form.
/// - `EFormAlreadyOpen` if form is already open.
entry fun reopen_form(
    form: &mut Form,
    owner_cap: &FormOwnerCap,
    ctx: &TxContext,
) {
    verify_owner_cap(owner_cap, form);
    assert!(form.is_closed, EFormAlreadyOpen);

    form.is_closed = false;

    event::emit(FormReopened {
        form_id: form.id.to_inner(),
        reopened_by: ctx.sender(),
    });
}

/// Updates the form's submission identity mode.
///
/// ## Parameters
/// - `form`: Mutable reference to the Form.
/// - `owner_cap`: The FormOwnerCap proving ownership.
/// - `new_mode`: The new identity mode — must be one of {0, 1, 2}.
/// - `ctx`: Transaction context.
///
/// ## Aborts
/// - `EFormIdMismatch` if cap doesn't match form.
/// - `EInvalidIdentityMode` if new_mode ∉ {0, 1, 2}.
entry fun update_identity_mode(
    form: &mut Form,
    owner_cap: &FormOwnerCap,
    new_mode: u8,
    ctx: &TxContext,
) {
    verify_owner_cap(owner_cap, form);
    validate_identity_mode(new_mode);

    let old_mode = form.submission_identity_mode;
    form.submission_identity_mode = new_mode;

    event::emit(FormIdentityModeUpdated {
        form_id: form.id.to_inner(),
        old_mode,
        new_mode,
        updated_by: ctx.sender(),
    });
}

// ─── Internal Helpers ───────────────────────────────────────────────────

/// Verifies cap.form_id matches form.id. Must be called before any
/// state mutation in privileged functions.
fun verify_owner_cap(cap: &FormOwnerCap, form: &Form) {
    assert!(cap.form_id == form.id.to_inner(), EFormIdMismatch);
}

// ─── Public Accessors ───────────────────────────────────────────────────

public fun owner(self: &Form): address { self.owner }
public fun schema_blob_id(self: &Form): vector<u8> { self.schema_blob_id }
public fun schema_version(self: &Form): u64 { self.schema_version }
public fun is_private(self: &Form): bool { self.is_private }
public fun is_closed(self: &Form): bool { self.is_closed }
public fun submission_count(self: &Form): u64 { self.submission_count }
public fun created_at(self: &Form): u64 { self.created_at }
public fun submission_identity_mode(self: &Form): u8 { self.submission_identity_mode }
public fun owner_cap_form_id(cap: &FormOwnerCap): ID { cap.form_id }

// ─── Package-Internal Accessors ─────────────────────────────────────────

/// Increments the form's submission count by 1. Called by submission module.
public(package) fun increment_submission_count(self: &mut Form) {
    self.submission_count = self.submission_count + 1;
}

/// Returns the Form's object ID.
public(package) fun id(self: &Form): ID { self.id.to_inner() }

/// Verifies a FormOwnerCap matches the given Form. Used by admin, branding, etc.
public(package) fun verify_cap(cap: &FormOwnerCap, form: &Form) {
    verify_owner_cap(cap, form);
}

/// Returns the FormOwnerCap's form_id. Used by admin::revoke_admin.
public(package) fun cap_form_id(cap: &FormOwnerCap): ID { cap.form_id }

/// Closes the form without requiring FormOwnerCap — package-internal only.
/// Used by `access::check_and_enforce_response_limit` when the response
/// limit is reached. Emits `FormClosed` event. Idempotent — no-op if
/// the form is already closed.
public(package) fun close_form_internal(form: &mut Form, closed_by: address) {
    if (!form.is_closed) {
        form.is_closed = true;
        event::emit(FormClosed {
            form_id: form.id.to_inner(),
            closed_by,
        });
    }
}

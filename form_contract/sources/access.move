/// Module: walrus_forms::access
///
/// Defines `FormAccessPolicy` and `AllowlistEntry` — on-chain access
/// control configuration for forms. Supports password protection,
/// time-bounded submission windows, response limits, and address allowlists.
///
/// ## Ownership Semantics
///
/// - `FormAccessPolicy` is an **owned object held by the form owner** (key only).
/// - `AllowlistEntry` objects are **owned objects held by the form owner** (key only).
///
/// ## One-Policy Convention
///
/// Move cannot natively enforce a single FormAccessPolicy per form for
/// owned objects. One-per-form is enforced by convention: the backend
/// indexes `AccessPolicyCreated` events and rejects duplicate creation
/// at the application layer.
///
/// ## Submission Integration
///
/// The `verify_submission_window` and `verify_password` functions are
/// `public(package)` and called by `submission::submit_with_policy` and
/// `submission::submit_anonymous_with_policy`. Callers must pass the
/// FormAccessPolicy as an immutable reference — it is not fetched
/// dynamically, keeping the submission path gas-efficient.
///
/// ## Password Hashing
///
/// The `password_hash` field stores a SHA3-256 hash of the password.
/// Hashing must be performed off-chain before the transaction is
/// constructed. The contract compares hashes — it never stores or
/// transmits plaintext passwords.
module walrus_forms::access;

use sui::event;
use walrus_forms::form::{Self, Form, FormOwnerCap};

// ─── Error Constants ────────────────────────────────────────────────────

const EFormNotInWindow: u64 = 14;
const EPasswordMismatch: u64 = 16;
const EAccessPolicyCapMismatch: u64 = 23;

// ─── Events ─────────────────────────────────────────────────────────────

/// Emitted when a FormAccessPolicy is created.
public struct AccessPolicyCreated has copy, drop {
    form_id: ID,
    policy_id: ID,
    has_response_limit: bool,
    response_limit: u64,
    has_opens_at: bool,
    has_closes_at: bool,
    has_password: bool,
    created_by: address,
}

/// Emitted when a FormAccessPolicy is updated.
public struct AccessPolicyUpdated has copy, drop {
    form_id: ID,
    policy_id: ID,
    updated_by: address,
}

/// Emitted when an address is added to the allowlist.
public struct AllowlistEntryAdded has copy, drop {
    form_id: ID,
    entry_id: ID,
    allowed_address: address,
    added_by: address,
}

/// Emitted when an allowlist entry is removed.
public struct AllowlistEntryRemoved has copy, drop {
    form_id: ID,
    entry_id: ID,
    allowed_address: address,
    removed_by: address,
}

// ─── Objects ────────────────────────────────────────────────────────────

/// Access control policy for a specific form.
///
/// Governs password protection, submission time windows, and response limits.
/// Owned by the form owner. One-per-form by convention.
public struct FormAccessPolicy has key {
    id: UID,
    /// The Form this policy governs.
    form_id: ID,
    /// Whether an allowlist is required for submissions.
    requires_allowlist: bool,
    /// Whether a response limit is enforced.
    has_response_limit: bool,
    /// Maximum number of submissions allowed. Used only when
    /// has_response_limit is true.
    response_limit: u64,
    /// Epoch number at which the form opens for submissions.
    /// None means no opening restriction.
    opens_at: Option<u64>,
    /// Epoch number at which the form closes for submissions.
    /// None means no closing restriction.
    closes_at: Option<u64>,
    /// SHA3-256 hash of the password. None means no password required.
    /// The contract NEVER stores plaintext passwords — only hashes.
    password_hash: Option<vector<u8>>,
}

/// An allowlist entry granting a specific address permission to submit.
///
/// Owned by the form owner. Discoverable via `AllowlistEntryAdded` events.
/// The backend indexes these events to check allowlist membership before
/// constructing a submission transaction.
public struct AllowlistEntry has key {
    id: UID,
    form_id: ID,
    allowed_address: address,
    added_at: u64,
}

// ─── Entry Functions ────────────────────────────────────────────────────

/// Creates a FormAccessPolicy for the given form.
///
/// ## Parameters
/// - `owner_cap`: FormOwnerCap proving ownership.
/// - `form`: Immutable reference to the Form.
/// - `requires_allowlist`: Whether submissions require allowlist membership.
/// - `has_response_limit`: Whether a response limit is enforced.
/// - `response_limit`: Max submissions (used only when has_response_limit = true).
/// - `opens_at`: Optional epoch number when submissions open.
/// - `closes_at`: Optional epoch number when submissions close.
/// - `password_hash`: Optional SHA3-256 hash of a password.
/// - `ctx`: Transaction context.
///
/// ## Aborts
/// - `EFormIdMismatch` if owner_cap does not match form.
///
/// ## Objects Created
/// - `FormAccessPolicy` → transferred to `ctx.sender()`.
entry fun create_access_policy(
    owner_cap: &FormOwnerCap,
    form: &Form,
    requires_allowlist: bool,
    has_response_limit: bool,
    response_limit: u64,
    opens_at: Option<u64>,
    closes_at: Option<u64>,
    password_hash: Option<vector<u8>>,
    ctx: &mut TxContext,
) {
    form::verify_cap(owner_cap, form);

    let form_id = form::id(form);
    let sender = ctx.sender();

    let has_opens_at = opens_at.is_some();
    let has_closes_at = closes_at.is_some();
    let has_password = password_hash.is_some();

    let policy = FormAccessPolicy {
        id: object::new(ctx),
        form_id,
        requires_allowlist,
        has_response_limit,
        response_limit,
        opens_at,
        closes_at,
        password_hash,
    };

    let policy_id = policy.id.to_inner();

    event::emit(AccessPolicyCreated {
        form_id,
        policy_id,
        has_response_limit,
        response_limit,
        has_opens_at,
        has_closes_at,
        has_password,
        created_by: sender,
    });

    transfer::transfer(policy, sender);
}

/// Updates all fields of an existing FormAccessPolicy.
///
/// ## Aborts
/// - `EAccessPolicyCapMismatch` if owner_cap.form_id ≠ policy.form_id.
entry fun update_access_policy(
    owner_cap: &FormOwnerCap,
    policy: &mut FormAccessPolicy,
    requires_allowlist: bool,
    has_response_limit: bool,
    response_limit: u64,
    opens_at: Option<u64>,
    closes_at: Option<u64>,
    password_hash: Option<vector<u8>>,
    ctx: &TxContext,
) {
    assert!(policy.form_id == form::cap_form_id(owner_cap), EAccessPolicyCapMismatch);

    policy.requires_allowlist = requires_allowlist;
    policy.has_response_limit = has_response_limit;
    policy.response_limit = response_limit;
    policy.opens_at = opens_at;
    policy.closes_at = closes_at;
    policy.password_hash = password_hash;

    event::emit(AccessPolicyUpdated {
        form_id: policy.form_id,
        policy_id: policy.id.to_inner(),
        updated_by: ctx.sender(),
    });
}

/// Adds an address to the form's allowlist.
///
/// ## Aborts
/// - `EFormIdMismatch` if owner_cap does not match form.
///
/// ## Objects Created
/// - `AllowlistEntry` → transferred to `ctx.sender()`.
entry fun add_to_allowlist(
    owner_cap: &FormOwnerCap,
    form: &Form,
    allowed_address: address,
    ctx: &mut TxContext,
) {
    form::verify_cap(owner_cap, form);

    let form_id = form::id(form);
    let sender = ctx.sender();

    let entry = AllowlistEntry {
        id: object::new(ctx),
        form_id,
        allowed_address,
        added_at: ctx.epoch(),
    };

    let entry_id = entry.id.to_inner();

    event::emit(AllowlistEntryAdded {
        form_id,
        entry_id,
        allowed_address,
        added_by: sender,
    });

    transfer::transfer(entry, sender);
}

/// Removes an allowlist entry by deleting the AllowlistEntry object.
///
/// ## Aborts
/// - `EAccessPolicyCapMismatch` if owner_cap.form_id ≠ entry.form_id.
entry fun remove_from_allowlist(
    owner_cap: &FormOwnerCap,
    entry: AllowlistEntry,
    ctx: &TxContext,
) {
    assert!(entry.form_id == form::cap_form_id(owner_cap), EAccessPolicyCapMismatch);

    let allowed_address = entry.allowed_address;
    let form_id = entry.form_id;
    let entry_id = entry.id.to_inner();

    let AllowlistEntry { id, form_id: _, allowed_address: _, added_at: _ } = entry;
    object::delete(id);

    event::emit(AllowlistEntryRemoved {
        form_id,
        entry_id,
        allowed_address,
        removed_by: ctx.sender(),
    });
}

/// Checks whether the form's submission count has reached the response limit,
/// and if so closes the form. This function is called by the backend as part
/// of a programmable transaction block composed with the submit call.
///
/// No-op if has_response_limit is false or limit not yet reached.
///
/// ## Aborts
/// - `EFormIdMismatch` if owner_cap does not match form.
/// - `EAccessPolicyCapMismatch` if policy does not match form.
entry fun check_and_enforce_response_limit(
    owner_cap: &FormOwnerCap,
    policy: &FormAccessPolicy,
    form: &mut Form,
    ctx: &TxContext,
) {
    form::verify_cap(owner_cap, form);
    assert!(policy.form_id == form::id(form), EAccessPolicyCapMismatch);

    if (policy.has_response_limit && form::submission_count(form) >= policy.response_limit) {
        form::close_form_internal(form, ctx.sender());
    }
}

// ─── Package-Internal Validation ────────────────────────────────────────

/// Validates that the current epoch is within the policy's time window.
///
/// Called by `submission::submit_with_policy` and `submit_anonymous_with_policy`.
///
/// ## Aborts
/// - `EFormNotInWindow` if current_epoch < opens_at (when set).
/// - `EFormNotInWindow` if current_epoch > closes_at (when set).
public(package) fun verify_submission_window(policy: &FormAccessPolicy, current_epoch: u64) {
    if (policy.opens_at.is_some()) {
        assert!(current_epoch >= *policy.opens_at.borrow(), EFormNotInWindow);
    };
    if (policy.closes_at.is_some()) {
        assert!(current_epoch <= *policy.closes_at.borrow(), EFormNotInWindow);
    };
}

/// Validates the provided password hash against the policy.
///
/// If the policy has no password, this is a no-op. If the policy has a
/// password and no hash is provided, or the hash doesn't match, aborts.
///
/// ## Aborts
/// - `EPasswordMismatch` if policy has password but provided_hash is none.
/// - `EPasswordMismatch` if hashes do not match.
public(package) fun verify_password(
    policy: &FormAccessPolicy,
    provided_hash: Option<vector<u8>>,
) {
    if (policy.password_hash.is_some()) {
        assert!(provided_hash.is_some(), EPasswordMismatch);
        assert!(
            *provided_hash.borrow() == *policy.password_hash.borrow(),
            EPasswordMismatch,
        );
    }
}

/// Returns the form_id this policy governs.
/// Used by submission module to validate policy ↔ form alignment.
public(package) fun policy_form_id(policy: &FormAccessPolicy): ID { policy.form_id }

// ─── Accessors ──────────────────────────────────────────────────────────

public fun form_id(self: &FormAccessPolicy): ID { self.form_id }
public fun requires_allowlist(self: &FormAccessPolicy): bool { self.requires_allowlist }
public fun has_response_limit(self: &FormAccessPolicy): bool { self.has_response_limit }
public fun response_limit(self: &FormAccessPolicy): u64 { self.response_limit }
public fun opens_at(self: &FormAccessPolicy): Option<u64> { self.opens_at }
public fun closes_at(self: &FormAccessPolicy): Option<u64> { self.closes_at }
public fun has_password(self: &FormAccessPolicy): bool { self.password_hash.is_some() }
public fun entry_form_id(self: &AllowlistEntry): ID { self.form_id }
public fun allowed_address(self: &AllowlistEntry): address { self.allowed_address }
public fun added_at(self: &AllowlistEntry): u64 { self.added_at }

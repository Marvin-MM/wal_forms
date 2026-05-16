/// Module: walrus_forms::sponsorship
///
/// Defines `SponsorshipPool` — an on-chain record that associates a
/// backend server wallet address with a specific form for the purpose
/// of sponsoring anonymous submissions.
///
/// ## Ownership Semantics
///
/// `SponsorshipPool` is an **owned object held by the form owner**
/// (`key + store` for transferability). Only one pool per form is
/// enforced by convention — the backend rejects duplicates via event
/// indexing since Move cannot natively enforce uniqueness for owned objects.
///
/// ## Off-Chain Validation Warning
///
/// The `sponsor_address` is validated against the value provided by the
/// caller at submission time. Since Move cannot introspect the actual Sui
/// gas sponsor, the sponsor_address parameter in `submit_anonymous` must
/// also be validated off-chain before constructing the transaction.
module walrus_forms::sponsorship;

use sui::event;
use walrus_forms::form::{Self, Form, FormOwnerCap};

// ─── Error Constants ────────────────────────────────────────────────────
// Values kept in sync with walrus_forms::errors

const EFormIdMismatch: u64 = 2;
const ESponsorshipInactive: u64 = 19;
const ESponsorMismatch: u64 = 20;

// ─── Events ─────────────────────────────────────────────────────────────

/// Emitted when a SponsorshipPool is created for a form.
public struct SponsorshipPoolCreated has copy, drop {
    form_id: ID,
    pool_id: ID,
    sponsor_address: address,
    created_by: address,
}

/// Emitted when a SponsorshipPool is deactivated.
public struct SponsorshipPoolDeactivated has copy, drop {
    form_id: ID,
    pool_id: ID,
    deactivated_by: address,
}

/// Emitted when a SponsorshipPool is reactivated.
public struct SponsorshipPoolReactivated has copy, drop {
    form_id: ID,
    pool_id: ID,
    reactivated_by: address,
}

// ─── Object ─────────────────────────────────────────────────────────────

/// On-chain record of a sponsorship commitment for a form.
///
/// The form owner creates this object to authorise a specific backend
/// wallet (`sponsor_address`) to sponsor anonymous submissions for their
/// form. The `submit_anonymous` entry function validates the pool's
/// sponsor_address and active status before accepting the submission.
///
/// ## Ownership
///
/// Owned by the form owner's address. `key + store` makes it
/// transferable via `transfer::public_transfer`.
public struct SponsorshipPool has key, store {
    id: UID,
    /// The Form this pool authorises sponsorship for.
    form_id: ID,
    /// The backend server wallet address authorised to sponsor transactions.
    sponsor_address: address,
    /// Whether this pool is currently active.
    is_active: bool,
    /// Epoch timestamp of pool creation.
    created_at: u64,
}

// ─── Entry Functions ────────────────────────────────────────────────────

/// Creates a SponsorshipPool authorising a sponsor wallet for the given form.
///
/// ## Parameters
/// - `owner_cap`: FormOwnerCap proving ownership of the form.
/// - `form`: Immutable reference to the Form (for ID verification).
/// - `sponsor_address`: The backend server wallet address to authorise.
/// - `ctx`: Transaction context.
///
/// ## Aborts
/// - `EFormIdMismatch` if owner_cap does not match form.
///
/// ## Objects Created
/// - `SponsorshipPool` → transferred to `ctx.sender()` (the form owner).
entry fun create_sponsorship_pool(
    owner_cap: &FormOwnerCap,
    form: &Form,
    sponsor_address: address,
    ctx: &mut TxContext,
) {
    form::verify_cap(owner_cap, form);

    let form_id = form::id(form);
    let sender = ctx.sender();

    let pool = SponsorshipPool {
        id: object::new(ctx),
        form_id,
        sponsor_address,
        is_active: true,
        created_at: ctx.epoch(),
    };

    let pool_id = pool.id.to_inner();

    event::emit(SponsorshipPoolCreated {
        form_id,
        pool_id,
        sponsor_address,
        created_by: sender,
    });

    transfer::public_transfer(pool, sender);
}

/// Deactivates a SponsorshipPool, preventing any new sponsored submissions.
///
/// ## Aborts
/// - `EFormIdMismatch` if owner_cap does not match pool's form_id.
entry fun deactivate_sponsorship_pool(
    owner_cap: &FormOwnerCap,
    pool: &mut SponsorshipPool,
    ctx: &TxContext,
) {
    assert!(pool.form_id == form::cap_form_id(owner_cap), EFormIdMismatch);

    pool.is_active = false;

    event::emit(SponsorshipPoolDeactivated {
        form_id: pool.form_id,
        pool_id: pool.id.to_inner(),
        deactivated_by: ctx.sender(),
    });
}

/// Reactivates a deactivated SponsorshipPool.
///
/// ## Aborts
/// - `EFormIdMismatch` if owner_cap does not match pool's form_id.
entry fun reactivate_sponsorship_pool(
    owner_cap: &FormOwnerCap,
    pool: &mut SponsorshipPool,
    ctx: &TxContext,
) {
    assert!(pool.form_id == form::cap_form_id(owner_cap), EFormIdMismatch);

    pool.is_active = true;

    event::emit(SponsorshipPoolReactivated {
        form_id: pool.form_id,
        pool_id: pool.id.to_inner(),
        reactivated_by: ctx.sender(),
    });
}

// ─── Package-Internal Validation ────────────────────────────────────────

/// Validates that the sponsorship pool is active and the provided
/// sponsor_address matches the pool's authorised address.
///
/// Called by `submission::submit_anonymous` before accepting the submission.
///
/// ## Aborts
/// - `ESponsorshipInactive` if pool.is_active == false.
/// - `ESponsorMismatch` if provided address ≠ pool.sponsor_address.
public(package) fun verify_sponsorship(pool: &SponsorshipPool, sponsor_address: address) {
    assert!(pool.is_active, ESponsorshipInactive);
    assert!(pool.sponsor_address == sponsor_address, ESponsorMismatch);
}

// ─── Accessors ──────────────────────────────────────────────────────────

public fun form_id(self: &SponsorshipPool): ID { self.form_id }
public fun sponsor_address(self: &SponsorshipPool): address { self.sponsor_address }
public fun is_active(self: &SponsorshipPool): bool { self.is_active }
public fun created_at(self: &SponsorshipPool): u64 { self.created_at }

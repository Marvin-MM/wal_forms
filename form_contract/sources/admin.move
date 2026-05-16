/// Module: walrus_forms::admin
///
/// AdminCap capability object and grant/revoke entry functions.
/// AdminCap grants scoped admin permissions for a single form.
///
/// ## Ownership: AdminCap → owned by grantee (key + store)
/// ## Transferability: store enables public_transfer
/// ## Revocation: requires the AdminCap object itself (see module docs)
module walrus_forms::admin;

use sui::event;
use walrus_forms::form::{Self, Form, FormOwnerCap};

// Error constants — values kept in sync with walrus_forms::errors
const EAdminCapFormMismatch: u64 = 6;

// ─── Events ─────────────────────────────────────────────────────────────

public struct AdminGranted has copy, drop {
    form_id: ID,
    admin_cap_id: ID,
    grantee: address,
    granted_by: address,
}

public struct AdminRevoked has copy, drop {
    form_id: ID,
    admin_cap_id: ID,
    grantee: address,
    revoked_by: address,
}

// ─── Object ─────────────────────────────────────────────────────────────

/// Capability granting admin permissions for a specific form.
/// Scoped by form_id — not a global admin capability.
/// Has `store` for transferability via public_transfer.
public struct AdminCap has key, store {
    id: UID,
    form_id: ID,
    grantee: address,
    granted_by: address,
    granted_at: u64,
}

// ─── Entry ──────────────────────────────────────────────────────────────

/// Grant admin access to a new address for a specific form.
/// Aborts: EFormIdMismatch
entry fun grant_admin(
    owner_cap: &FormOwnerCap,
    form: &Form,
    grantee: address,
    ctx: &mut TxContext,
) {
    form::verify_cap(owner_cap, form);

    let form_id = form::id(form);
    let sender = ctx.sender();

    let admin_cap = AdminCap {
        id: object::new(ctx),
        form_id,
        grantee,
        granted_by: sender,
        granted_at: ctx.epoch(),
    };

    let admin_cap_id = admin_cap.id.to_inner();

    event::emit(AdminGranted {
        form_id,
        admin_cap_id,
        grantee,
        granted_by: sender,
    });

    transfer::public_transfer(admin_cap, grantee);
}

/// Revoke admin access by destroying the AdminCap object.
/// The cap is unpacked and its UID deleted — correct Sui revocation pattern.
/// Aborts: EAdminCapFormMismatch
entry fun revoke_admin(
    owner_cap: &FormOwnerCap,
    admin_cap: AdminCap,
    ctx: &TxContext,
) {
    assert!(
        admin_cap.form_id == form::cap_form_id(owner_cap),
        EAdminCapFormMismatch,
    );

    let grantee = admin_cap.grantee;
    let form_id = admin_cap.form_id;
    let admin_cap_id = admin_cap.id.to_inner();

    let AdminCap { id, form_id: _, grantee: _, granted_by: _, granted_at: _ } = admin_cap;
    object::delete(id);

    event::emit(AdminRevoked {
        form_id,
        admin_cap_id,
        grantee,
        revoked_by: ctx.sender(),
    });
}

// ─── Accessors ──────────────────────────────────────────────────────────

public fun form_id(self: &AdminCap): ID { self.form_id }
public fun grantee(self: &AdminCap): address { self.grantee }
public fun granted_by(self: &AdminCap): address { self.granted_by }
public fun granted_at(self: &AdminCap): u64 { self.granted_at }

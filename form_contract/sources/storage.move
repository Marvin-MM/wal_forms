/// Module: walrus_forms::storage
///
/// Defines `StorageRenewalRecord` — an on-chain audit trail for Walrus
/// storage renewal actions performed by the backend service.
///
/// ## Important: No Direct Walrus Interaction
///
/// Move contracts cannot make external network calls. This module does
/// NOT interact with the Walrus publisher or renew storage on-chain.
/// It is purely a record-keeping module. The backend renews storage
/// off-chain via the Walrus publisher API, then calls
/// `record_storage_renewal` to create an on-chain audit trail of
/// that renewal action. This makes the storage history verifiable
/// for legal, compliance, or auditing contexts.
///
/// ## Ownership Semantics
///
/// `StorageRenewalRecord` objects are **owned objects transferred to
/// the form owner's address** at creation. Discoverable via
/// `StorageRenewed` events.
module walrus_forms::storage;

use sui::event;
use walrus_forms::form::{Self, Form, FormOwnerCap};

// ─── Constants ──────────────────────────────────────────────────────────

const BLOB_ID_LENGTH: u64 = 32;

// Error constants — values kept in sync with walrus_forms::errors
const EInvalidBlobIdLength: u64 = 4;

// ─── Events ─────────────────────────────────────────────────────────────

/// Emitted when a storage renewal is recorded on-chain.
public struct StorageRenewed has copy, drop {
    form_id: ID,
    record_id: ID,
    blob_id: vector<u8>,
    epochs_extended: u64,
    renewed_by: address,
}

// ─── Object ─────────────────────────────────────────────────────────────

/// An on-chain audit record of a storage renewal action performed off-chain.
///
/// The backend renews Walrus storage via the publisher API, then creates
/// this record to provide an immutable, verifiable on-chain trace of
/// each renewal. The record does not itself perform or guarantee storage
/// renewal — it is an attestation that the backend performed the action.
///
/// Ownership: transferred to the form owner's address at creation.
public struct StorageRenewalRecord has key {
    id: UID,
    /// The Walrus blob ID that was renewed.
    blob_id: vector<u8>,
    /// The Form this blob belongs to.
    form_id: ID,
    /// The address that called this function (backend server wallet).
    renewed_by: address,
    /// Epoch timestamp when this record was created.
    renewed_at: u64,
    /// Number of epochs the storage was extended by, as reported
    /// by the backend after completing the Walrus renewal.
    epochs_extended: u64,
}

// ─── Entry Functions ────────────────────────────────────────────────────

/// Records an off-chain storage renewal as an on-chain audit trail.
///
/// Called by the backend server after successfully renewing storage
/// with the Walrus publisher. Creates a `StorageRenewalRecord` and
/// transfers it to the form owner's address.
///
/// ## Parameters
/// - `owner_cap`: FormOwnerCap proving ownership of the form.
/// - `form`: Immutable reference to the Form.
/// - `blob_id`: The 32-byte Walrus blob ID that was renewed.
/// - `epochs_extended`: Number of epochs the storage was extended.
/// - `ctx`: Transaction context.
///
/// ## Aborts
/// - `EFormIdMismatch` if owner_cap does not match form.
/// - `EInvalidBlobIdLength` if blob_id is not 32 bytes.
///
/// ## Objects Created
/// - `StorageRenewalRecord` → transferred to `ctx.sender()`.
entry fun record_storage_renewal(
    owner_cap: &FormOwnerCap,
    form: &Form,
    blob_id: vector<u8>,
    epochs_extended: u64,
    ctx: &mut TxContext,
) {
    form::verify_cap(owner_cap, form);
    assert!(blob_id.length() == BLOB_ID_LENGTH, EInvalidBlobIdLength);

    let form_id = form::id(form);
    let sender = ctx.sender();

    let record = StorageRenewalRecord {
        id: object::new(ctx),
        blob_id,
        form_id,
        renewed_by: sender,
        renewed_at: ctx.epoch(),
        epochs_extended,
    };

    let record_id = record.id.to_inner();

    event::emit(StorageRenewed {
        form_id,
        record_id,
        blob_id: record.blob_id,
        epochs_extended,
        renewed_by: sender,
    });

    transfer::transfer(record, sender);
}

// ─── Accessors ──────────────────────────────────────────────────────────

public fun blob_id(self: &StorageRenewalRecord): vector<u8> { self.blob_id }
public fun form_id(self: &StorageRenewalRecord): ID { self.form_id }
public fun renewed_by(self: &StorageRenewalRecord): address { self.renewed_by }
public fun renewed_at(self: &StorageRenewalRecord): u64 { self.renewed_at }
public fun epochs_extended(self: &StorageRenewalRecord): u64 { self.epochs_extended }

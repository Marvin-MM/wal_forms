/// Module: walrus_forms::schema_version
///
/// Defines the `SchemaVersion` object — an immutable record of a single
/// schema revision for a form. SchemaVersion objects form a logical
/// linked list via `parent_blob_id`, enabling full schema history
/// replay and submission integrity auditing.
///
/// ## Ownership Semantics
///
/// SchemaVersion objects are **owned objects transferred to the form
/// owner's address**. They are created only during `form::create`
/// (version 0) and `form::update_schema` (subsequent versions).
/// The `create` function is `public(package)` — it cannot be called
/// by external packages or direct entry, ensuring schema versions
/// are only produced as part of legitimate form operations.
///
/// ## Immutability
///
/// No mutation functions are provided. Once created, a SchemaVersion
/// is a permanent, auditable record. Its on-chain existence and the
/// linked blob ID chain constitute the verifiable schema history.
module walrus_forms::schema_version;

use sui::event;

// ─── Constants ──────────────────────────────────────────────────────────

/// Expected length of a Walrus blob ID in bytes (SHA-256 hash).
const BLOB_ID_LENGTH: u64 = 32;

// Error constant — value kept in sync with walrus_forms::errors
const EInvalidBlobIdLength: u64 = 4;

// ─── Event Definitions ─────────────────────────────────────────────────

/// Emitted when a new SchemaVersion record is created.
public struct SchemaVersionCreated has copy, drop {
    /// The Form object ID this version belongs to.
    form_id: ID,
    /// The SchemaVersion object ID.
    version_id: ID,
    /// The version number (0-indexed).
    version_number: u64,
    /// The Walrus blob ID of this schema version.
    blob_id: vector<u8>,
}

// ─── Object Definition ─────────────────────────────────────────────────

/// An immutable record of a single schema version for a form.
///
/// Each SchemaVersion links to its predecessor via `parent_blob_id`,
/// forming a verifiable chain of schema evolution. Version 0 has
/// `parent_blob_id = option::none()`.
public struct SchemaVersion has key {
    id: UID,
    /// The Form object ID this version belongs to.
    form_id: ID,
    /// The Walrus blob ID of the schema at this version (32 bytes).
    blob_id: vector<u8>,
    /// The zero-indexed version number.
    version_number: u64,
    /// The blob ID of the previous schema version, or `none` for v0.
    parent_blob_id: Option<vector<u8>>,
    /// The epoch timestamp when this version was created.
    created_at: u64,
}

// ─── Package-Internal Creation ──────────────────────────────────────────

/// Creates a new SchemaVersion and transfers it to the form owner.
///
/// This function is `public(package)` — it can only be called by
/// other modules within the `walrus_forms` package (specifically
/// `form::create` and `form::update_schema`). External callers
/// cannot create schema versions directly.
///
/// ## Parameters
/// - `form_id`: The ID of the Form this version belongs to.
/// - `blob_id`: The 32-byte Walrus blob ID for this schema version.
/// - `version_number`: The zero-indexed version number.
/// - `parent_blob_id`: The previous version's blob ID, or `none` for v0.
/// - `owner`: The form owner's address (recipient of the object).
/// - `ctx`: Transaction context.
///
/// ## Aborts
/// - `EInvalidBlobIdLength` if `blob_id` is not exactly 32 bytes.
public(package) fun create(
    form_id: ID,
    blob_id: vector<u8>,
    version_number: u64,
    parent_blob_id: Option<vector<u8>>,
    owner: address,
    ctx: &mut TxContext,
) {
    assert!(blob_id.length() == BLOB_ID_LENGTH, EInvalidBlobIdLength);

    let schema_version = SchemaVersion {
        id: object::new(ctx),
        form_id,
        blob_id,
        version_number,
        parent_blob_id,
        created_at: ctx.epoch(),
    };

    event::emit(SchemaVersionCreated {
        form_id,
        version_id: schema_version.id.to_inner(),
        version_number,
        blob_id: schema_version.blob_id,
    });

    transfer::transfer(schema_version, owner);
}

// ─── Public Accessors ───────────────────────────────────────────────────
// Read-only accessors for composability with other packages.

/// Returns the Form ID this schema version belongs to.
public fun form_id(self: &SchemaVersion): ID { self.form_id }

/// Returns the Walrus blob ID of this schema version.
public fun blob_id(self: &SchemaVersion): vector<u8> { self.blob_id }

/// Returns the zero-indexed version number.
public fun version_number(self: &SchemaVersion): u64 { self.version_number }

/// Returns the parent blob ID (`none` for version 0).
public fun parent_blob_id(self: &SchemaVersion): Option<vector<u8>> { self.parent_blob_id }

/// Returns the epoch timestamp of creation.
public fun created_at(self: &SchemaVersion): u64 { self.created_at }

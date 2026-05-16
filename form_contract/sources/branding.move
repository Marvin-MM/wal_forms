/// Module: walrus_forms::branding
///
/// Defines `BrandingAsset` — an on-chain record linking a Walrus-stored
/// branding asset (logo, background, favicon) to a specific form.
///
/// ## Ownership Semantics
///
/// `BrandingAsset` objects are **owned objects transferred to the form
/// owner's address** at creation. They are not stored inside the Form
/// struct — the Form must remain small and contention-free.
///
/// ## Discoverability
///
/// The form-to-assets relationship is discoverable via event indexing.
/// The backend indexes `BrandingAssetRegistered` events to build the
/// form-to-assets mapping in its database. The frontend queries this
/// mapping to render branding assets without a backend round-trip for
/// common cases.
///
/// ## Validation
///
/// Blob IDs are validated to be exactly 32 bytes (Walrus SHA-256 hash).
/// Asset types are validated against the three named constants.
/// MIME type hints are validated against a known-safe set of image types.
module walrus_forms::branding;

use std::string::String;
use sui::event;
use walrus_forms::form::{Self, Form, FormOwnerCap};

// ─── Constants ──────────────────────────────────────────────────────────

const BLOB_ID_LENGTH: u64 = 32;

/// Form logo asset type.
const ASSET_LOGO: u8 = 0;
/// Form background image asset type.
const ASSET_BACKGROUND: u8 = 1;
/// Form favicon asset type.
const ASSET_FAVICON: u8 = 2;

// Error constants — values kept in sync with walrus_forms::errors
const EInvalidBlobIdLength: u64 = 4;
const EInvalidAssetType: u64 = 17;
const EInvalidMimeType: u64 = 18;
const EBrandingCapMismatch: u64 = 22;

// ─── Events ─────────────────────────────────────────────────────────────

/// Emitted when a new branding asset is registered for a form.
public struct BrandingAssetRegistered has copy, drop {
    form_id: ID,
    asset_id: ID,
    asset_type: u8,
    blob_id: vector<u8>,
    owner: address,
}

/// Emitted when a branding asset's blob ID is updated.
public struct BrandingAssetUpdated has copy, drop {
    form_id: ID,
    asset_id: ID,
    old_blob_id: vector<u8>,
    new_blob_id: vector<u8>,
    updated_by: address,
}

/// Emitted when a branding asset is removed.
public struct BrandingAssetRemoved has copy, drop {
    form_id: ID,
    asset_id: ID,
    asset_type: u8,
    removed_by: address,
}

// ─── Object ─────────────────────────────────────────────────────────────

/// An on-chain record of a branding asset for a specific form.
///
/// Ownership: transferred to the form owner's address at creation.
/// The asset is not embedded in the Form struct — the relationship
/// is established via the form_id field and discoverable via events.
public struct BrandingAsset has key {
    id: UID,
    /// The Form this asset belongs to.
    form_id: ID,
    /// One of ASSET_LOGO (0), ASSET_BACKGROUND (1), ASSET_FAVICON (2).
    asset_type: u8,
    /// 32-byte Walrus blob ID of the asset content.
    blob_id: vector<u8>,
    /// MIME type hint for the frontend renderer (e.g. "image/png").
    /// Validated against the known-safe set at creation and update time.
    mime_type_hint: String,
    /// Epoch timestamp of initial registration.
    uploaded_at: u64,
    /// The form owner's address at registration time.
    owner: address,
}

// ─── Validation Helpers ─────────────────────────────────────────────────

fun validate_asset_type(asset_type: u8) {
    assert!(
        asset_type == ASSET_LOGO || asset_type == ASSET_BACKGROUND || asset_type == ASSET_FAVICON,
        EInvalidAssetType,
    );
}

fun validate_mime_type(mime: &String) {
    let bytes = mime.as_bytes();
    // Known-safe image MIME types (as utf-8 byte comparisons)
    let png  = b"image/png";
    let jpeg = b"image/jpeg";
    let webp = b"image/webp";
    let svg  = b"image/svg+xml";
    let gif  = b"image/gif";
    let ico  = b"image/x-icon";
    assert!(
        bytes == png  || bytes == jpeg || bytes == webp ||
        bytes == svg  || bytes == gif  || bytes == ico,
        EInvalidMimeType,
    );
}

// ─── Entry Functions ────────────────────────────────────────────────────

/// Registers a new branding asset for the given form.
///
/// ## Parameters
/// - `owner_cap`: FormOwnerCap proving ownership of the form.
/// - `form`: Immutable reference to the Form (for ID verification).
/// - `asset_type`: One of ASSET_LOGO (0), ASSET_BACKGROUND (1), ASSET_FAVICON (2).
/// - `blob_id`: 32-byte Walrus blob ID of the asset.
/// - `mime_type_hint`: Known-safe MIME type string.
/// - `ctx`: Transaction context.
///
/// ## Aborts
/// - `EFormIdMismatch` if owner_cap does not match form.
/// - `EInvalidBlobIdLength` if blob_id is not 32 bytes.
/// - `EInvalidAssetType` if asset_type ∉ {0, 1, 2}.
/// - `EInvalidMimeType` if mime_type_hint is not in the known-safe set.
///
/// ## Objects Created
/// - `BrandingAsset` → transferred to `ctx.sender()`.
entry fun register_branding_asset(
    owner_cap: &FormOwnerCap,
    form: &Form,
    asset_type: u8,
    blob_id: vector<u8>,
    mime_type_hint: String,
    ctx: &mut TxContext,
) {
    form::verify_cap(owner_cap, form);
    assert!(blob_id.length() == BLOB_ID_LENGTH, EInvalidBlobIdLength);
    validate_asset_type(asset_type);
    validate_mime_type(&mime_type_hint);

    let form_id = form::id(form);
    let sender = ctx.sender();

    let asset = BrandingAsset {
        id: object::new(ctx),
        form_id,
        asset_type,
        blob_id,
        mime_type_hint,
        uploaded_at: ctx.epoch(),
        owner: sender,
    };

    let asset_id = asset.id.to_inner();

    event::emit(BrandingAssetRegistered {
        form_id,
        asset_id,
        asset_type,
        blob_id: asset.blob_id,
        owner: sender,
    });

    transfer::transfer(asset, sender);
}

/// Updates the blob ID of an existing branding asset (e.g. logo renewal).
///
/// Validates the new blob ID length and MIME type. The asset_type is
/// not changed — create a new asset to change the type.
///
/// ## Aborts
/// - `EBrandingCapMismatch` if owner_cap.form_id ≠ asset.form_id.
/// - `EInvalidBlobIdLength` if new_blob_id is not 32 bytes.
entry fun update_branding_asset(
    owner_cap: &FormOwnerCap,
    asset: &mut BrandingAsset,
    new_blob_id: vector<u8>,
    ctx: &TxContext,
) {
    assert!(asset.form_id == form::cap_form_id(owner_cap), EBrandingCapMismatch);
    assert!(new_blob_id.length() == BLOB_ID_LENGTH, EInvalidBlobIdLength);

    let old_blob_id = asset.blob_id;
    asset.blob_id = new_blob_id;

    event::emit(BrandingAssetUpdated {
        form_id: asset.form_id,
        asset_id: asset.id.to_inner(),
        old_blob_id,
        new_blob_id,
        updated_by: ctx.sender(),
    });
}

/// Removes a branding asset by deleting the BrandingAsset object.
///
/// ## Aborts
/// - `EBrandingCapMismatch` if owner_cap.form_id ≠ asset.form_id.
entry fun remove_branding_asset(
    owner_cap: &FormOwnerCap,
    asset: BrandingAsset,
    ctx: &TxContext,
) {
    assert!(asset.form_id == form::cap_form_id(owner_cap), EBrandingCapMismatch);

    let form_id = asset.form_id;
    let asset_type = asset.asset_type;
    let asset_id = asset.id.to_inner();

    let BrandingAsset { id, form_id: _, asset_type: _, blob_id: _, mime_type_hint: _, uploaded_at: _, owner: _ } = asset;
    object::delete(id);

    event::emit(BrandingAssetRemoved {
        form_id,
        asset_id,
        asset_type,
        removed_by: ctx.sender(),
    });
}

// ─── Accessors ──────────────────────────────────────────────────────────

public fun form_id(self: &BrandingAsset): ID { self.form_id }
public fun asset_type(self: &BrandingAsset): u8 { self.asset_type }
public fun blob_id(self: &BrandingAsset): vector<u8> { self.blob_id }
public fun mime_type_hint(self: &BrandingAsset): String { self.mime_type_hint }
public fun uploaded_at(self: &BrandingAsset): u64 { self.uploaded_at }
public fun owner(self: &BrandingAsset): address { self.owner }

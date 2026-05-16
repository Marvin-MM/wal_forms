/// Module: walrus_forms::events
///
/// Re-exports and documents all event types for the `walrus_forms` package.
///
/// ## Architecture Note
///
/// Sui Move requires that event types passed to `sui::event::emit`
/// are defined in the SAME module that calls `emit`. Therefore, event
/// structs are defined in their respective business-logic modules:
///
/// - `FormCreated`, `SchemaUpdated`, `FormClosed`, `FormReopened`,
///   `FormIdentityModeUpdated`
///   → defined in `walrus_forms::form`
/// - `SubmissionReceived`, `DeletionRequested`
///   → defined in `walrus_forms::submission`
/// - `AdminGranted`, `AdminRevoked`
///   → defined in `walrus_forms::admin`
/// - `SchemaVersionCreated`
///   → defined in `walrus_forms::schema_version`
/// - `BrandingAssetRegistered`, `BrandingAssetUpdated`, `BrandingAssetRemoved`
///   → defined in `walrus_forms::branding`
/// - `AccessPolicyCreated`, `AccessPolicyUpdated`,
///   `AllowlistEntryAdded`, `AllowlistEntryRemoved`
///   → defined in `walrus_forms::access`
/// - `SponsorshipPoolCreated`, `SponsorshipPoolDeactivated`,
///   `SponsorshipPoolReactivated`
///   → defined in `walrus_forms::sponsorship`
/// - `StorageRenewed`
///   → defined in `walrus_forms::storage`
///
/// This module exists as documentation and a reference index for
/// the backend indexer team. See each source module for the full
/// struct definitions.
///
/// ## Event Schema Reference (for backend indexer)
///
/// ### FormCreated
/// | Field | Type | Description |
/// |-------|------|-------------|
/// | form_id | ID | The new Form's object ID |
/// | owner | address | Form creator's address |
/// | schema_blob_id | vector<u8> | Initial schema blob ID (32 bytes) |
/// | is_private | bool | Whether submissions are encrypted |
/// | schema_version | u64 | Always 0 at creation |
/// | submission_identity_mode | u8 | 0=anonymous, 1=optional, 2=required |
///
/// ### SchemaUpdated
/// | Field | Type | Description |
/// |-------|------|-------------|
/// | form_id | ID | Form object ID |
/// | old_blob_id | vector<u8> | Previous schema blob ID |
/// | new_blob_id | vector<u8> | New schema blob ID |
/// | new_version | u64 | New schema version number |
/// | updater | address | Address that performed update |
///
/// ### FormClosed
/// | Field | Type | Description |
/// |-------|------|-------------|
/// | form_id | ID | Form object ID |
/// | closed_by | address | Address that closed the form |
///
/// ### FormReopened
/// | Field | Type | Description |
/// |-------|------|-------------|
/// | form_id | ID | Form object ID |
/// | reopened_by | address | Address that reopened the form |
///
/// ### FormIdentityModeUpdated (NEW in v2)
/// | Field | Type | Description |
/// |-------|------|-------------|
/// | form_id | ID | Form object ID |
/// | old_mode | u8 | Previous identity mode |
/// | new_mode | u8 | New identity mode |
/// | updated_by | address | Address that updated the mode |
///
/// ### SubmissionReceived (UPDATED in v2)
/// | Field | Type | Description |
/// |-------|------|-------------|
/// | form_id | ID | Form object ID |
/// | receipt_id | ID | SubmissionReceipt object ID |
/// | blob_id | vector<u8> | Submission content blob ID (32 bytes) |
/// | submitter | Option<address> | Submitter's address, or None if anonymous |
/// | schema_version | u64 | Schema version at submission time |
/// | is_encrypted | bool | Whether content is encrypted |
/// | identity_mode | u8 | Identity mode active at submission (NEW) |
/// | is_sponsored | bool | Whether ctx.sender() != sponsor_address (NEW) |
///
/// ### DeletionRequested (NEW in v2)
/// | Field | Type | Description |
/// |-------|------|-------------|
/// | receipt_id | ID | The SubmissionReceipt referenced |
/// | form_id | ID | Form object ID |
/// | requester | address | Address requesting deletion |
/// | form_owner | address | Form owner the request was routed to |
///
/// ### AdminGranted
/// | Field | Type | Description |
/// |-------|------|-------------|
/// | form_id | ID | Form object ID |
/// | admin_cap_id | ID | The new AdminCap object ID |
/// | grantee | address | Address receiving admin access |
/// | granted_by | address | Form owner's address |
///
/// ### AdminRevoked
/// | Field | Type | Description |
/// |-------|------|-------------|
/// | form_id | ID | Form object ID |
/// | admin_cap_id | ID | The destroyed AdminCap object ID |
/// | grantee | address | Address whose access was revoked |
/// | revoked_by | address | Address that revoked access |
///
/// ### SchemaVersionCreated
/// | Field | Type | Description |
/// |-------|------|-------------|
/// | form_id | ID | Form object ID |
/// | version_id | ID | SchemaVersion object ID |
/// | version_number | u64 | Version number (0-indexed) |
/// | blob_id | vector<u8> | Schema blob ID (32 bytes) |
///
/// ### BrandingAssetRegistered (NEW in v2)
/// | Field | Type | Description |
/// |-------|------|-------------|
/// | form_id | ID | Form object ID |
/// | asset_id | ID | BrandingAsset object ID |
/// | asset_type | u8 | 0=logo, 1=background, 2=favicon |
/// | blob_id | vector<u8> | Asset content blob ID (32 bytes) |
/// | owner | address | Form owner's address |
///
/// ### BrandingAssetUpdated (NEW in v2)
/// | Field | Type | Description |
/// |-------|------|-------------|
/// | form_id | ID | Form object ID |
/// | asset_id | ID | BrandingAsset object ID |
/// | old_blob_id | vector<u8> | Previous blob ID |
/// | new_blob_id | vector<u8> | New blob ID |
/// | updated_by | address | Address that updated the asset |
///
/// ### BrandingAssetRemoved (NEW in v2)
/// | Field | Type | Description |
/// |-------|------|-------------|
/// | form_id | ID | Form object ID |
/// | asset_id | ID | Deleted BrandingAsset object ID |
/// | asset_type | u8 | Asset type of the removed asset |
/// | removed_by | address | Address that removed the asset |
///
/// ### AccessPolicyCreated (NEW in v2)
/// | Field | Type | Description |
/// |-------|------|-------------|
/// | form_id | ID | Form object ID |
/// | policy_id | ID | FormAccessPolicy object ID |
/// | has_response_limit | bool | Whether a response limit is set |
/// | response_limit | u64 | Max submissions (if has_response_limit) |
/// | has_opens_at | bool | Whether an opening time is set |
/// | has_closes_at | bool | Whether a closing time is set |
/// | has_password | bool | Whether a password hash is set |
/// | created_by | address | Form owner's address |
///
/// ### AccessPolicyUpdated (NEW in v2)
/// | Field | Type | Description |
/// |-------|------|-------------|
/// | form_id | ID | Form object ID |
/// | policy_id | ID | FormAccessPolicy object ID |
/// | updated_by | address | Address that updated the policy |
///
/// ### AllowlistEntryAdded (NEW in v2)
/// | Field | Type | Description |
/// |-------|------|-------------|
/// | form_id | ID | Form object ID |
/// | entry_id | ID | AllowlistEntry object ID |
/// | allowed_address | address | Newly allowed address |
/// | added_by | address | Form owner's address |
///
/// ### AllowlistEntryRemoved (NEW in v2)
/// | Field | Type | Description |
/// |-------|------|-------------|
/// | form_id | ID | Form object ID |
/// | entry_id | ID | Deleted AllowlistEntry object ID |
/// | allowed_address | address | Address that was removed |
/// | removed_by | address | Address that removed the entry |
///
/// ### SponsorshipPoolCreated (NEW in v2)
/// | Field | Type | Description |
/// |-------|------|-------------|
/// | form_id | ID | Form object ID |
/// | pool_id | ID | SponsorshipPool object ID |
/// | sponsor_address | address | Authorised sponsor wallet address |
/// | created_by | address | Form owner's address |
///
/// ### SponsorshipPoolDeactivated (NEW in v2)
/// | Field | Type | Description |
/// |-------|------|-------------|
/// | form_id | ID | Form object ID |
/// | pool_id | ID | SponsorshipPool object ID |
/// | deactivated_by | address | Address that deactivated the pool |
///
/// ### SponsorshipPoolReactivated (NEW in v2)
/// | Field | Type | Description |
/// |-------|------|-------------|
/// | form_id | ID | Form object ID |
/// | pool_id | ID | SponsorshipPool object ID |
/// | reactivated_by | address | Address that reactivated the pool |
///
/// ### StorageRenewed (NEW in v2)
/// | Field | Type | Description |
/// |-------|------|-------------|
/// | form_id | ID | Form object ID |
/// | record_id | ID | StorageRenewalRecord object ID |
/// | blob_id | vector<u8> | Renewed blob ID (32 bytes) |
/// | epochs_extended | u64 | Number of epochs storage was extended |
/// | renewed_by | address | Address that recorded the renewal |
module walrus_forms::events;
// This module intentionally has no code — it serves as documentation.
// All event structs are defined in their respective modules due to
// Sui Move's requirement that event types must be defined in the
// same module that emits them.

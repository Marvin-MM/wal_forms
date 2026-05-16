# WalrusForms — Sui Move Smart Contract

A production-grade Sui Move smart contract package serving as the **verifiable on-chain registry** for the WalrusForms platform. The contract stores cryptographic references to Walrus content and ownership/access-control primitives — not content itself.

## Object Model

```
┌─────────────────────────────────────────────────────────────────────┐
│                        WalrusForms Object Model                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐ shared    Anyone can submit to it                     │
│  │   Form   │───────►  Stores schema blob ID, version, counters     │
│  └──────────┘                                                       │
│       │                                                             │
│       │ created with                                                │
│       ▼                                                             │
│  ┌──────────────┐ owned (creator)                                   │
│  │ FormOwnerCap │───────► Non-transferable proof of form ownership   │
│  └──────────────┘         key only (no store)                       │
│                                                                     │
│  ┌────────────────────┐ owned (submitter)                           │
│  │ SubmissionReceipt  │───────► Proof of submission with schema ver  │
│  └────────────────────┘         Created per-submission (parallel)    │
│                                                                     │
│  ┌───────────────┐ owned (form owner)                               │
│  │ SchemaVersion │───────► Immutable schema history record           │
│  └───────────────┘         Linked list via parent_blob_id            │
│                                                                     │
│  ┌──────────┐ owned (grantee)                                       │
│  │ AdminCap │───────► Scoped admin access for one form               │
│  └──────────┘         key + store (transferable)                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Ownership Semantics

| Object | Ownership | Abilities | Transferable | Notes |
|--------|-----------|-----------|--------------|-------|
| `Form` | **Shared** | `key` | N/A (shared) | Anyone can reference it for submissions |
| `FormOwnerCap` | **Owned** (creator) | `key` | No | Prevents accidental ownership loss |
| `SubmissionReceipt` | **Owned** (submitter) | `key` | No | One per submission, parallel creation |
| `SchemaVersion` | **Owned** (form owner) | `key` | No | Immutable once created |
| `AdminCap` | **Owned** (grantee) | `key, store` | Yes | `store` enables `public_transfer` |

## Module Structure

```
sources/
├── errors.move          # Named error constants (reference module)
├── events.move          # Event documentation (reference module)
├── form.move            # Form + FormOwnerCap + lifecycle events
├── submission.move      # SubmissionReceipt + submit entry
├── schema_version.move  # SchemaVersion + creation (package-internal)
└── admin.move           # AdminCap + grant/revoke
```

## Entry Point Call Sequences

### 1. Create a Form

```
Caller: Form owner (any address)
Function: walrus_forms::form::create(schema_blob_id: vector<u8>, is_private: bool)
```

**Creates:**
- `Form` → shared object
- `FormOwnerCap` → transferred to sender
- `SchemaVersion` (v0) → transferred to sender

**Events emitted:** `FormCreated`, `SchemaVersionCreated`

### 2. Submit to a Form

```
Caller: Any address (no auth required)
Function: walrus_forms::submission::submit(form: &mut Form, blob_id: vector<u8>, is_encrypted: bool)
```

**Creates:**
- `SubmissionReceipt` → transferred to sender

**Events emitted:** `SubmissionReceived`

**Aborts if:** Form is closed (`EFormClosed`) or blob ID ≠ 32 bytes (`EInvalidBlobIdLength`)

### 3. Update Schema

```
Caller: Form owner (must hold FormOwnerCap)
Function: walrus_forms::form::update_schema(form: &mut Form, owner_cap: &FormOwnerCap, new_schema_blob_id: vector<u8>)
```

**Creates:**
- `SchemaVersion` (v_n+1) → transferred to sender

**Events emitted:** `SchemaUpdated`, `SchemaVersionCreated`

### 4. Close / Reopen Form

```
Caller: Form owner (must hold FormOwnerCap)
Functions:
  walrus_forms::form::close_form(form: &mut Form, owner_cap: &FormOwnerCap)
  walrus_forms::form::reopen_form(form: &mut Form, owner_cap: &FormOwnerCap)
```

**Events emitted:** `FormClosed` / `FormReopened`

### 5. Grant Admin Access

```
Caller: Form owner (must hold FormOwnerCap)
Function: walrus_forms::admin::grant_admin(owner_cap: &FormOwnerCap, form: &Form, grantee: address)
```

**Creates:**
- `AdminCap` → transferred to grantee via `public_transfer`

**Events emitted:** `AdminGranted`

### 6. Revoke Admin Access

```
Caller: Form owner (must hold FormOwnerCap AND the AdminCap to revoke)
Function: walrus_forms::admin::revoke_admin(owner_cap: &FormOwnerCap, admin_cap: AdminCap)
```

**Destroys:** `AdminCap` (unpacked, UID deleted)

**Events emitted:** `AdminRevoked`

**Note:** Requires the AdminCap object itself. The grantee must cooperate by transferring it back.

## Event Schema (for Backend Indexer)

All event types are defined in their respective modules. Event type names for querying:

| Event Type | Module | Key Fields |
|-----------|--------|------------|
| `FormCreated` | `form` | `form_id`, `owner`, `schema_blob_id`, `is_private`, `schema_version` |
| `SchemaUpdated` | `form` | `form_id`, `old_blob_id`, `new_blob_id`, `new_version`, `updater` |
| `FormClosed` | `form` | `form_id`, `closed_by` |
| `FormReopened` | `form` | `form_id`, `reopened_by` |
| `SubmissionReceived` | `submission` | `form_id`, `receipt_id`, `blob_id`, `submitter`, `schema_version`, `is_encrypted` |
| `AdminGranted` | `admin` | `form_id`, `admin_cap_id`, `grantee`, `granted_by` |
| `AdminRevoked` | `admin` | `form_id`, `admin_cap_id`, `grantee`, `revoked_by` |
| `SchemaVersionCreated` | `schema_version` | `form_id`, `version_id`, `version_number`, `blob_id` |

## Error Codes

| Code | Constant | Module(s) | Trigger |
|------|----------|-----------|---------|
| 1 | `EUnauthorized` | errors | Missing capability |
| 2 | `EFormIdMismatch` | form | Cap's form_id ≠ Form's ID |
| 3 | `EFormClosed` | submission | Submission to closed form |
| 4 | `EInvalidBlobIdLength` | form, submission, schema_version | Blob ID ≠ 32 bytes |
| 5 | `ESchemaVersionMismatch` | errors | Schema version mismatch (reserved) |
| 6 | `EAdminCapFormMismatch` | admin | AdminCap form_id ≠ FormOwnerCap form_id |
| 8 | `EInvalidFieldConfig` | errors | Invalid field config (reserved) |
| 9 | `ECapRevoked` | errors | Revoked admin cap (reserved) |
| 10 | `EFormAlreadyClosed` | form | Double-close |
| 11 | `EFormAlreadyOpen` | form | Double-reopen |

## Gas Efficiency

The submission hot path (`submit`) is optimised for minimum gas:
- Closed-form check is the **first operation** (zero state mutation on abort)
- Blob ID validation is constant-time
- Only shared-state mutation: `submission_count` increment
- All other writes create new owned objects (parallel, no contention)
- No dynamic fields, no vector scaling, no string operations

### Scaling Consideration

Under extreme submission volume, `submission_count` increment on the shared Form may cause contention. Mitigation path:
1. Remove `submission_count` from Form
2. Count submissions via event indexing in the backend
3. This change is a compatible upgrade (adding/removing fields)

## Deployment Checklist

### Pre-Deployment

- [ ] All tests pass: `sui move build && sui move test`
- [ ] Deploy to testnet first
- [ ] Fund deployer wallet with sufficient SUI for gas
- [ ] Estimate gas for common operations on testnet

### Deployment

```bash
# Publish to testnet
sui client publish --gas-budget 100000000

# Record the published package ID from the output
# It will appear as "Published Objects" → package ID
```

### Post-Deployment

- [ ] Record the published **package ID**
- [ ] Update backend `.env`: `SUI_MOVE_PACKAGE_ID=<published_id>`
- [ ] Update frontend constants file with package ID
- [ ] Call each entry function once on testnet to verify:
  - `form::create` — verify Form is shared, FormOwnerCap received
  - `submission::submit` — verify SubmissionReceipt received
  - `form::update_schema` — verify version increments
  - `form::close_form` / `form::reopen_form` — verify toggle
  - `admin::grant_admin` — verify AdminCap received
  - `admin::revoke_admin` — verify AdminCap destroyed
- [ ] Verify events appear in transaction explorer
- [ ] Keep the `UpgradeCap` — do NOT destroy it

### Upgrade Procedure

The `UpgradeCap` is transferred to the deployer at publish time. To upgrade:

```bash
sui client upgrade --gas-budget 100000000 --upgrade-capability <upgrade_cap_id>
```

**Backward compatibility guarantees:**
- `SubmissionReceipt` objects from v1 remain readable in v2
- `SchemaVersion` objects remain backward compatible
- Adding new fields to existing structs is allowed in compatible upgrades
- Removing or reordering fields requires an incompatible upgrade

## Security Model

1. **Capability verification before mutation** — Every privileged function verifies the cap's `form_id` matches the target Form before any state change
2. **No phantom ownership** — Cap confusion attacks (using cap_A on form_B) are caught by ID comparison
3. **Closed form enforcement** — Checked first in submit (fast abort)
4. **Blob ID validation** — 32-byte length enforced on every write
5. **Integer overflow** — u64 arithmetic aborts on overflow (acceptable: 2^64 is unreachable)
6. **No global admin** — All caps are scoped to a single form

## Backend Integration Notes

The existing `SuiBlockchainClient` in `src/infrastructure/sui/client.ts` will need updates after deployment:

1. **Blob IDs**: Pass as `vector<u8>` (32 raw bytes), not strings
2. **FormOwnerCap**: Owner-gated operations require the cap object reference
3. **Form is shared**: Use shared object transaction patterns
4. **Entry functions**: Match the exact function signatures in each module

## License

Apache-2.0

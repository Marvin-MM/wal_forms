#[test_only]
/// Comprehensive tests for the form module.
module walrus_forms::form_tests;

use sui::test_scenario;
use walrus_forms::form::{Self, Form, FormOwnerCap};
use walrus_forms::schema_version::SchemaVersion;

const OWNER: address = @0xA;
const OTHER: address = @0xB;

// Identity mode constants (mirrored from submission for test clarity)
const IDENTITY_ANONYMOUS: u8 = 0;
const IDENTITY_REQUIRED: u8 = 2;

fun valid_blob_id(): vector<u8> {
    vector[
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
        17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32
    ]
}

fun another_blob_id(): vector<u8> {
    vector[
        32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17,
        16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1
    ]
}

// ─── Form Creation ──────────────────────────────────────────────────────

#[test]
fun test_create_form_success() {
    let mut scenario = test_scenario::begin(OWNER);
    {
        form::create(valid_blob_id(), false, IDENTITY_REQUIRED, scenario.ctx());
    };

    scenario.next_tx(OWNER);
    {
        let form = test_scenario::take_shared<Form>(&scenario);
        assert!(form::owner(&form) == OWNER);
        assert!(form::schema_blob_id(&form) == valid_blob_id());
        assert!(form::schema_version(&form) == 0);
        assert!(!form::is_private(&form));
        assert!(!form::is_closed(&form));
        assert!(form::submission_count(&form) == 0);
        assert!(form::submission_identity_mode(&form) == IDENTITY_REQUIRED);
        test_scenario::return_shared(form);

        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        test_scenario::return_to_sender(&scenario, cap);

        let sv = test_scenario::take_from_sender<SchemaVersion>(&scenario);
        assert!(walrus_forms::schema_version::version_number(&sv) == 0);
        assert!(walrus_forms::schema_version::parent_blob_id(&sv).is_none());
        assert!(walrus_forms::schema_version::blob_id(&sv) == valid_blob_id());
        test_scenario::return_to_sender(&scenario, sv);
    };

    scenario.end();
}

#[test]
fun test_create_form_private() {
    let mut scenario = test_scenario::begin(OWNER);
    {
        form::create(valid_blob_id(), true, IDENTITY_REQUIRED, scenario.ctx());
    };
    scenario.next_tx(OWNER);
    {
        let form = test_scenario::take_shared<Form>(&scenario);
        assert!(form::is_private(&form));
        test_scenario::return_shared(form);
    };
    scenario.end();
}

#[test]
fun test_create_form_anonymous_mode() {
    let mut scenario = test_scenario::begin(OWNER);
    {
        form::create(valid_blob_id(), false, IDENTITY_ANONYMOUS, scenario.ctx());
    };
    scenario.next_tx(OWNER);
    {
        let form = test_scenario::take_shared<Form>(&scenario);
        assert!(form::submission_identity_mode(&form) == IDENTITY_ANONYMOUS);
        test_scenario::return_shared(form);
    };
    scenario.end();
}

#[test, expected_failure(abort_code = walrus_forms::form::EInvalidBlobIdLength)]
fun test_create_form_invalid_blob_id_too_short() {
    let mut scenario = test_scenario::begin(OWNER);
    form::create(vector[1, 2, 3], false, IDENTITY_REQUIRED, scenario.ctx());
    scenario.end();
}

#[test, expected_failure(abort_code = walrus_forms::form::EInvalidBlobIdLength)]
fun test_create_form_invalid_blob_id_too_long() {
    let mut scenario = test_scenario::begin(OWNER);
    let mut long_blob = valid_blob_id();
    long_blob.push_back(99);
    form::create(long_blob, false, IDENTITY_REQUIRED, scenario.ctx());
    scenario.end();
}

#[test, expected_failure(abort_code = walrus_forms::form::EInvalidBlobIdLength)]
fun test_create_form_empty_blob_id() {
    let mut scenario = test_scenario::begin(OWNER);
    form::create(vector[], false, IDENTITY_REQUIRED, scenario.ctx());
    scenario.end();
}

#[test, expected_failure(abort_code = walrus_forms::form::EInvalidIdentityMode)]
fun test_create_form_invalid_identity_mode() {
    let mut scenario = test_scenario::begin(OWNER);
    form::create(valid_blob_id(), false, 99u8, scenario.ctx());
    scenario.end();
}

// ─── Schema Update ──────────────────────────────────────────────────────

#[test]
fun test_update_schema_success() {
    let mut scenario = test_scenario::begin(OWNER);
    {
        form::create(valid_blob_id(), false, IDENTITY_REQUIRED, scenario.ctx());
    };

    scenario.next_tx(OWNER);
    {
        let mut form = test_scenario::take_shared<Form>(&scenario);
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);

        form::update_schema(&mut form, &cap, another_blob_id(), scenario.ctx());

        assert!(form::schema_version(&form) == 1);
        assert!(form::schema_blob_id(&form) == another_blob_id());

        test_scenario::return_shared(form);
        test_scenario::return_to_sender(&scenario, cap);
    };

    scenario.next_tx(OWNER);
    {
        let sv = test_scenario::take_from_sender<SchemaVersion>(&scenario);
        if (walrus_forms::schema_version::version_number(&sv) == 1) {
            assert!(walrus_forms::schema_version::parent_blob_id(&sv).is_some());
        };
        test_scenario::return_to_sender(&scenario, sv);
    };

    scenario.end();
}

#[test, expected_failure(abort_code = walrus_forms::form::EInvalidBlobIdLength)]
fun test_update_schema_invalid_blob_id() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_blob_id(), false, IDENTITY_REQUIRED, scenario.ctx()); };

    scenario.next_tx(OWNER);
    {
        let mut form = test_scenario::take_shared<Form>(&scenario);
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        form::update_schema(&mut form, &cap, vector[1, 2], scenario.ctx());
        test_scenario::return_shared(form);
        test_scenario::return_to_sender(&scenario, cap);
    };
    scenario.end();
}

// ─── Capability Confusion ───────────────────────────────────────────────

#[test, expected_failure(abort_code = walrus_forms::form::EFormIdMismatch)]
fun test_update_schema_wrong_cap() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_blob_id(), false, IDENTITY_REQUIRED, scenario.ctx()); };

    scenario.next_tx(OWNER);
    let form_a_id: ID;
    {
        let cap_a = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        form_a_id = form::owner_cap_form_id(&cap_a);
        test_scenario::return_to_sender(&scenario, cap_a);
    };

    scenario.next_tx(OTHER);
    { form::create(valid_blob_id(), false, IDENTITY_REQUIRED, scenario.ctx()); };

    scenario.next_tx(OTHER);
    {
        let mut form_a = test_scenario::take_shared_by_id<Form>(&scenario, form_a_id);
        let cap_b = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        form::update_schema(&mut form_a, &cap_b, another_blob_id(), scenario.ctx());
        test_scenario::return_shared(form_a);
        test_scenario::return_to_sender(&scenario, cap_b);
    };
    scenario.end();
}

// ─── Update Identity Mode ───────────────────────────────────────────────

#[test]
fun test_update_identity_mode_success() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_blob_id(), false, IDENTITY_REQUIRED, scenario.ctx()); };

    scenario.next_tx(OWNER);
    {
        let mut form = test_scenario::take_shared<Form>(&scenario);
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        form::update_identity_mode(&mut form, &cap, IDENTITY_ANONYMOUS, scenario.ctx());
        assert!(form::submission_identity_mode(&form) == IDENTITY_ANONYMOUS);
        test_scenario::return_shared(form);
        test_scenario::return_to_sender(&scenario, cap);
    };
    scenario.end();
}

#[test, expected_failure(abort_code = walrus_forms::form::EInvalidIdentityMode)]
fun test_update_identity_mode_invalid_value() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_blob_id(), false, IDENTITY_REQUIRED, scenario.ctx()); };

    scenario.next_tx(OWNER);
    {
        let mut form = test_scenario::take_shared<Form>(&scenario);
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        form::update_identity_mode(&mut form, &cap, 99u8, scenario.ctx());
        test_scenario::return_shared(form);
        test_scenario::return_to_sender(&scenario, cap);
    };
    scenario.end();
}

// ─── Close / Reopen ─────────────────────────────────────────────────────

#[test]
fun test_close_and_reopen_form() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_blob_id(), false, IDENTITY_REQUIRED, scenario.ctx()); };

    scenario.next_tx(OWNER);
    {
        let mut form = test_scenario::take_shared<Form>(&scenario);
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        form::close_form(&mut form, &cap, scenario.ctx());
        assert!(form::is_closed(&form));
        test_scenario::return_shared(form);
        test_scenario::return_to_sender(&scenario, cap);
    };

    scenario.next_tx(OWNER);
    {
        let mut form = test_scenario::take_shared<Form>(&scenario);
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        form::reopen_form(&mut form, &cap, scenario.ctx());
        assert!(!form::is_closed(&form));
        test_scenario::return_shared(form);
        test_scenario::return_to_sender(&scenario, cap);
    };
    scenario.end();
}

#[test, expected_failure(abort_code = walrus_forms::form::EFormAlreadyClosed)]
fun test_double_close_aborts() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_blob_id(), false, IDENTITY_REQUIRED, scenario.ctx()); };

    scenario.next_tx(OWNER);
    {
        let mut form = test_scenario::take_shared<Form>(&scenario);
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        form::close_form(&mut form, &cap, scenario.ctx());
        form::close_form(&mut form, &cap, scenario.ctx());
        test_scenario::return_shared(form);
        test_scenario::return_to_sender(&scenario, cap);
    };
    scenario.end();
}

#[test, expected_failure(abort_code = walrus_forms::form::EFormAlreadyOpen)]
fun test_double_reopen_aborts() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_blob_id(), false, IDENTITY_REQUIRED, scenario.ctx()); };

    scenario.next_tx(OWNER);
    {
        let mut form = test_scenario::take_shared<Form>(&scenario);
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        form::reopen_form(&mut form, &cap, scenario.ctx());
        test_scenario::return_shared(form);
        test_scenario::return_to_sender(&scenario, cap);
    };
    scenario.end();
}

#[test, expected_failure(abort_code = walrus_forms::form::EFormIdMismatch)]
fun test_close_wrong_cap() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_blob_id(), false, IDENTITY_REQUIRED, scenario.ctx()); };

    scenario.next_tx(OWNER);
    let form_a_id: ID;
    {
        let cap_a = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        form_a_id = form::owner_cap_form_id(&cap_a);
        test_scenario::return_to_sender(&scenario, cap_a);
    };

    scenario.next_tx(OTHER);
    { form::create(valid_blob_id(), false, IDENTITY_REQUIRED, scenario.ctx()); };

    scenario.next_tx(OTHER);
    {
        let mut form_a = test_scenario::take_shared_by_id<Form>(&scenario, form_a_id);
        let cap_b = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        form::close_form(&mut form_a, &cap_b, scenario.ctx());
        test_scenario::return_shared(form_a);
        test_scenario::return_to_sender(&scenario, cap_b);
    };
    scenario.end();
}

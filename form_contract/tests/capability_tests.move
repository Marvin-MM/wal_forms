#[test_only]
/// Cross-cutting capability confusion and security tests.
/// These tests verify that caps from one form cannot operate on another.
module walrus_forms::capability_tests;

use sui::test_scenario;
use walrus_forms::form::{Self, Form, FormOwnerCap};
use walrus_forms::submission;

const OWNER_A: address = @0xA;
const OWNER_B: address = @0xB;
const SUBMITTER: address = @0xC;

fun valid_blob_id(): vector<u8> {
    vector[
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
        17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32
    ]
}

fun sub_blob(): vector<u8> {
    vector[
        99, 98, 97, 96, 95, 94, 93, 92, 91, 90, 89, 88, 87, 86, 85, 84,
        83, 82, 81, 80, 79, 78, 77, 76, 75, 74, 73, 72, 71, 70, 69, 68
    ]
}

// ─── Cap Confusion: close ───────────────────────────────────────────────
// OWNER_B creates form B, gets cap_b. We then create form A.
// OWNER_B tries to use cap_b on form_a → should abort EFormIdMismatch.

#[test, expected_failure(abort_code = walrus_forms::form::EFormIdMismatch)]
fun test_cap_confusion_close() {
    let mut scenario = test_scenario::begin(OWNER_A);
    { form::create(valid_blob_id(), false, 2u8, scenario.ctx()); };

    scenario.next_tx(OWNER_B);
    { form::create(valid_blob_id(), false, 2u8, scenario.ctx()); };

    // OWNER_A takes their cap (which points to form_a)
    // OWNER_B takes their cap (which points to form_b)
    // Then OWNER_B uses cap_b on form_a
    scenario.next_tx(OWNER_A);
    let form_a_id: ID;
    {
        let cap_a = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        form_a_id = form::owner_cap_form_id(&cap_a);
        test_scenario::return_to_sender(&scenario, cap_a);
    };

    scenario.next_tx(OWNER_B);
    {
        // Take form_a specifically by its ID
        let mut form_a = test_scenario::take_shared_by_id<Form>(&scenario, form_a_id);
        let cap_b = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        // cap_b belongs to form_b, form_a is a different form → should abort
        form::close_form(&mut form_a, &cap_b, scenario.ctx());
        test_scenario::return_shared(form_a);
        test_scenario::return_to_sender(&scenario, cap_b);
    };
    scenario.end();
}

// ─── Cap Confusion: reopen ──────────────────────────────────────────────

#[test, expected_failure(abort_code = walrus_forms::form::EFormIdMismatch)]
fun test_cap_confusion_reopen() {
    let mut scenario = test_scenario::begin(OWNER_A);
    { form::create(valid_blob_id(), false, 2u8, scenario.ctx()); };

    // Close form_a properly
    scenario.next_tx(OWNER_A);
    let form_a_id: ID;
    {
        let cap_a = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        form_a_id = form::owner_cap_form_id(&cap_a);
        let mut form_a = test_scenario::take_shared_by_id<Form>(&scenario, form_a_id);
        form::close_form(&mut form_a, &cap_a, scenario.ctx());
        test_scenario::return_shared(form_a);
        test_scenario::return_to_sender(&scenario, cap_a);
    };

    // Create form_b owned by OWNER_B
    scenario.next_tx(OWNER_B);
    { form::create(valid_blob_id(), false, 2u8, scenario.ctx()); };

    // OWNER_B tries to reopen form_a using cap_b
    scenario.next_tx(OWNER_B);
    {
        let mut form_a = test_scenario::take_shared_by_id<Form>(&scenario, form_a_id);
        let cap_b = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        form::reopen_form(&mut form_a, &cap_b, scenario.ctx());
        test_scenario::return_shared(form_a);
        test_scenario::return_to_sender(&scenario, cap_b);
    };
    scenario.end();
}

// ─── Cap Confusion: update_schema ───────────────────────────────────────

#[test, expected_failure(abort_code = walrus_forms::form::EFormIdMismatch)]
fun test_cap_confusion_update_schema() {
    let mut scenario = test_scenario::begin(OWNER_A);
    { form::create(valid_blob_id(), false, 2u8, scenario.ctx()); };

    scenario.next_tx(OWNER_A);
    let form_a_id: ID;
    {
        let cap_a = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        form_a_id = form::owner_cap_form_id(&cap_a);
        test_scenario::return_to_sender(&scenario, cap_a);
    };

    scenario.next_tx(OWNER_B);
    { form::create(valid_blob_id(), false, 2u8, scenario.ctx()); };

    let new_blob = vector[
        50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65,
        66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81
    ];

    scenario.next_tx(OWNER_B);
    {
        let mut form_a = test_scenario::take_shared_by_id<Form>(&scenario, form_a_id);
        let cap_b = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        form::update_schema(&mut form_a, &cap_b, new_blob, scenario.ctx());
        test_scenario::return_shared(form_a);
        test_scenario::return_to_sender(&scenario, cap_b);
    };
    scenario.end();
}

// ─── Full Lifecycle ─────────────────────────────────────────────────────

#[test]
fun test_full_lifecycle() {
    let mut scenario = test_scenario::begin(OWNER_A);
    { form::create(valid_blob_id(), false, 2u8, scenario.ctx()); };

    scenario.next_tx(SUBMITTER);
    {
        let mut form = test_scenario::take_shared<Form>(&scenario);
        submission::submit(&mut form, sub_blob(), false, scenario.ctx());
        assert!(form::submission_count(&form) == 1);
        test_scenario::return_shared(form);
    };

    scenario.next_tx(OWNER_A);
    {
        let mut form = test_scenario::take_shared<Form>(&scenario);
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        form::close_form(&mut form, &cap, scenario.ctx());
        test_scenario::return_shared(form);
        test_scenario::return_to_sender(&scenario, cap);
    };

    scenario.next_tx(OWNER_A);
    {
        let form = test_scenario::take_shared<Form>(&scenario);
        assert!(form::is_closed(&form));
        assert!(form::submission_count(&form) == 1);
        test_scenario::return_shared(form);
    };
    scenario.end();
}

#[test_only]
/// Tests for the access control module.
module walrus_forms::access_tests;

use sui::test_scenario;
use walrus_forms::access::{Self, FormAccessPolicy, AllowlistEntry};
use walrus_forms::form::{Self, Form, FormOwnerCap};
use walrus_forms::submission;

const OWNER: address = @0xA;
const OTHER: address = @0xB;
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

// ─── AccessPolicy Creation ─────────────────────────────────────────────

#[test]
fun test_create_access_policy_success() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_blob_id(), false, 2u8, scenario.ctx()); };

    scenario.next_tx(OWNER);
    {
        let form = test_scenario::take_shared<Form>(&scenario);
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        access::create_access_policy(
            &cap,
            &form,
            false,           // requires_allowlist
            true,            // has_response_limit
            100,             // response_limit
            option::none(),  // opens_at
            option::none(),  // closes_at
            option::none(),  // password_hash
            scenario.ctx(),
        );
        test_scenario::return_shared(form);
        test_scenario::return_to_sender(&scenario, cap);
    };

    scenario.next_tx(OWNER);
    {
        let policy = test_scenario::take_from_sender<FormAccessPolicy>(&scenario);
        assert!(access::has_response_limit(&policy));
        assert!(access::response_limit(&policy) == 100);
        assert!(!access::requires_allowlist(&policy));
        assert!(!access::has_password(&policy));
        test_scenario::return_to_sender(&scenario, policy);
    };
    scenario.end();
}

#[test, expected_failure(abort_code = walrus_forms::form::EFormIdMismatch)]
fun test_create_access_policy_wrong_cap() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_blob_id(), false, 2u8, scenario.ctx()); };

    scenario.next_tx(OWNER);
    let form_a_id: ID;
    {
        let cap_a = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        form_a_id = form::owner_cap_form_id(&cap_a);
        test_scenario::return_to_sender(&scenario, cap_a);
    };

    scenario.next_tx(OTHER);
    { form::create(valid_blob_id(), false, 2u8, scenario.ctx()); };

    scenario.next_tx(OTHER);
    {
        let form_a = test_scenario::take_shared_by_id<Form>(&scenario, form_a_id);
        let cap_b = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        access::create_access_policy(
            &cap_b, &form_a, false, false, 0, option::none(), option::none(), option::none(), scenario.ctx(),
        );
        test_scenario::return_shared(form_a);
        test_scenario::return_to_sender(&scenario, cap_b);
    };
    scenario.end();
}

// ─── Response Limit ─────────────────────────────────────────────────────

#[test]
fun test_response_limit_closes_form() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_blob_id(), false, 2u8, scenario.ctx()); };

    // Create policy with limit of 2
    scenario.next_tx(OWNER);
    {
        let form = test_scenario::take_shared<Form>(&scenario);
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        access::create_access_policy(
            &cap, &form, false, true, 2, option::none(), option::none(), option::none(), scenario.ctx(),
        );
        test_scenario::return_shared(form);
        test_scenario::return_to_sender(&scenario, cap);
    };

    // Submit twice
    scenario.next_tx(SUBMITTER);
    {
        let mut form = test_scenario::take_shared<Form>(&scenario);
        submission::submit(&mut form, sub_blob(), false, scenario.ctx());
        submission::submit(&mut form, sub_blob(), false, scenario.ctx());
        assert!(form::submission_count(&form) == 2);
        test_scenario::return_shared(form);
    };

    // Owner enforces limit — form should close
    scenario.next_tx(OWNER);
    {
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        let policy = test_scenario::take_from_sender<FormAccessPolicy>(&scenario);
        let mut form = test_scenario::take_shared<Form>(&scenario);

        assert!(!form::is_closed(&form));
        access::check_and_enforce_response_limit(&cap, &policy, &mut form, scenario.ctx());
        assert!(form::is_closed(&form));

        test_scenario::return_shared(form);
        test_scenario::return_to_sender(&scenario, cap);
        test_scenario::return_to_sender(&scenario, policy);
    };
    scenario.end();
}

#[test]
fun test_response_limit_not_reached_no_close() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_blob_id(), false, 2u8, scenario.ctx()); };

    scenario.next_tx(OWNER);
    {
        let form = test_scenario::take_shared<Form>(&scenario);
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        access::create_access_policy(
            &cap, &form, false, true, 10, option::none(), option::none(), option::none(), scenario.ctx(),
        );
        test_scenario::return_shared(form);
        test_scenario::return_to_sender(&scenario, cap);
    };

    scenario.next_tx(SUBMITTER);
    {
        let mut form = test_scenario::take_shared<Form>(&scenario);
        submission::submit(&mut form, sub_blob(), false, scenario.ctx());
        test_scenario::return_shared(form);
    };

    scenario.next_tx(OWNER);
    {
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        let policy = test_scenario::take_from_sender<FormAccessPolicy>(&scenario);
        let mut form = test_scenario::take_shared<Form>(&scenario);

        access::check_and_enforce_response_limit(&cap, &policy, &mut form, scenario.ctx());
        // Not closed — limit not yet reached
        assert!(!form::is_closed(&form));

        test_scenario::return_shared(form);
        test_scenario::return_to_sender(&scenario, cap);
        test_scenario::return_to_sender(&scenario, policy);
    };
    scenario.end();
}

// ─── Time Window ────────────────────────────────────────────────────────

#[test, expected_failure(abort_code = walrus_forms::access::EFormNotInWindow)]
fun test_submit_before_opens_at_aborts() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_blob_id(), false, 2u8, scenario.ctx()); };

    // Policy: opens at epoch 100 (current epoch in test is always 0)
    scenario.next_tx(OWNER);
    {
        let form = test_scenario::take_shared<Form>(&scenario);
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        access::create_access_policy(
            &cap, &form, false, false, 0,
            option::some(100u64), // opens_at far in future
            option::none(),
            option::none(),
            scenario.ctx(),
        );
        test_scenario::return_shared(form);
        test_scenario::return_to_sender(&scenario, cap);
    };

    scenario.next_tx(SUBMITTER);
    {
        let mut form = test_scenario::take_shared<Form>(&scenario);
        let policy = test_scenario::take_from_address<FormAccessPolicy>(&scenario, OWNER);
        // Aborts: current epoch (0) < opens_at (100)
        submission::submit_with_policy(
            &mut form, &policy, sub_blob(), false, option::none(), scenario.ctx(),
        );
        test_scenario::return_shared(form);
        test_scenario::return_to_address(OWNER, policy);
    };
    scenario.end();
}

/// Tests that a policy with no time window or password does not block submissions.
#[test]
fun test_submit_with_open_policy_succeeds() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_blob_id(), false, 2u8, scenario.ctx()); };

    scenario.next_tx(OWNER);
    {
        let form = test_scenario::take_shared<Form>(&scenario);
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        access::create_access_policy(
            &cap, &form, false, false, 0,
            option::none(), option::none(), option::none(),
            scenario.ctx(),
        );
        test_scenario::return_shared(form);
        test_scenario::return_to_sender(&scenario, cap);
    };

    scenario.next_tx(SUBMITTER);
    {
        let mut form = test_scenario::take_shared<Form>(&scenario);
        let policy = test_scenario::take_from_address<FormAccessPolicy>(&scenario, OWNER);
        submission::submit_with_policy(
            &mut form, &policy, sub_blob(), false, option::none(), scenario.ctx(),
        );
        assert!(form::submission_count(&form) == 1);
        test_scenario::return_shared(form);
        test_scenario::return_to_address(OWNER, policy);
    };
    scenario.end();
}

// ─── Password Check ─────────────────────────────────────────────────────

#[test]
fun test_submit_with_correct_password() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_blob_id(), false, 2u8, scenario.ctx()); };

    let password_hash = vector[
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1
    ];

    scenario.next_tx(OWNER);
    {
        let form = test_scenario::take_shared<Form>(&scenario);
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        access::create_access_policy(
            &cap, &form, false, false, 0,
            option::none(), option::none(),
            option::some(password_hash),
            scenario.ctx(),
        );
        test_scenario::return_shared(form);
        test_scenario::return_to_sender(&scenario, cap);
    };

    scenario.next_tx(SUBMITTER);
    {
        let mut form = test_scenario::take_shared<Form>(&scenario);
        let policy = test_scenario::take_from_address<FormAccessPolicy>(&scenario, OWNER);
        // Correct password hash passes
        submission::submit_with_policy(
            &mut form, &policy, sub_blob(), false, option::some(password_hash), scenario.ctx(),
        );
        assert!(form::submission_count(&form) == 1);
        test_scenario::return_shared(form);
        test_scenario::return_to_address(OWNER, policy);
    };
    scenario.end();
}

#[test, expected_failure(abort_code = walrus_forms::access::EPasswordMismatch)]
fun test_submit_with_wrong_password_aborts() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_blob_id(), false, 2u8, scenario.ctx()); };

    let correct_hash = vector[
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1
    ];
    let wrong_hash = vector[
        2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
        2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2
    ];

    scenario.next_tx(OWNER);
    {
        let form = test_scenario::take_shared<Form>(&scenario);
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        access::create_access_policy(
            &cap, &form, false, false, 0,
            option::none(), option::none(),
            option::some(correct_hash),
            scenario.ctx(),
        );
        test_scenario::return_shared(form);
        test_scenario::return_to_sender(&scenario, cap);
    };

    scenario.next_tx(SUBMITTER);
    {
        let mut form = test_scenario::take_shared<Form>(&scenario);
        let policy = test_scenario::take_from_address<FormAccessPolicy>(&scenario, OWNER);
        submission::submit_with_policy(
            &mut form, &policy, sub_blob(), false, option::some(wrong_hash), scenario.ctx(),
        );
        test_scenario::return_shared(form);
        test_scenario::return_to_address(OWNER, policy);
    };
    scenario.end();
}

// ─── Allowlist ───────────────────────────────────────────────────────────

#[test]
fun test_add_and_remove_allowlist_entry() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_blob_id(), false, 2u8, scenario.ctx()); };

    scenario.next_tx(OWNER);
    {
        let form = test_scenario::take_shared<Form>(&scenario);
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        access::add_to_allowlist(&cap, &form, SUBMITTER, scenario.ctx());
        test_scenario::return_shared(form);
        test_scenario::return_to_sender(&scenario, cap);
    };

    scenario.next_tx(OWNER);
    {
        let entry = test_scenario::take_from_sender<AllowlistEntry>(&scenario);
        assert!(access::allowed_address(&entry) == SUBMITTER);
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        access::remove_from_allowlist(&cap, entry, scenario.ctx());
        test_scenario::return_to_sender(&scenario, cap);
    };

    scenario.next_tx(OWNER);
    {
        assert!(!test_scenario::has_most_recent_for_sender<AllowlistEntry>(&scenario));
    };
    scenario.end();
}

// ─── Policy Update ──────────────────────────────────────────────────────

#[test]
fun test_update_access_policy() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_blob_id(), false, 2u8, scenario.ctx()); };

    scenario.next_tx(OWNER);
    {
        let form = test_scenario::take_shared<Form>(&scenario);
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        access::create_access_policy(
            &cap, &form, false, false, 0, option::none(), option::none(), option::none(), scenario.ctx(),
        );
        test_scenario::return_shared(form);
        test_scenario::return_to_sender(&scenario, cap);
    };

    scenario.next_tx(OWNER);
    {
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        let mut policy = test_scenario::take_from_sender<FormAccessPolicy>(&scenario);
        access::update_access_policy(
            &cap, &mut policy,
            true, true, 50, option::none(), option::none(), option::none(),
            scenario.ctx(),
        );
        assert!(access::has_response_limit(&policy));
        assert!(access::response_limit(&policy) == 50);
        assert!(access::requires_allowlist(&policy));
        test_scenario::return_to_sender(&scenario, cap);
        test_scenario::return_to_sender(&scenario, policy);
    };
    scenario.end();
}

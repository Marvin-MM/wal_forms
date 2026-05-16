#[test_only]
/// Tests for the admin module.
module walrus_forms::admin_tests;

use sui::test_scenario;
use walrus_forms::form::{Self, Form, FormOwnerCap};
use walrus_forms::admin::{Self, AdminCap};

const OWNER: address = @0xA;
const ADMIN: address = @0xD;

fun valid_blob_id(): vector<u8> {
    vector[
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
        17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32
    ]
}

#[test]
fun test_grant_admin_success() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_blob_id(), false, 2u8, scenario.ctx()); };

    scenario.next_tx(OWNER);
    {
        let form = test_scenario::take_shared<Form>(&scenario);
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        admin::grant_admin(&cap, &form, ADMIN, scenario.ctx());
        test_scenario::return_shared(form);
        test_scenario::return_to_sender(&scenario, cap);
    };

    scenario.next_tx(ADMIN);
    {
        let admin_cap = test_scenario::take_from_sender<AdminCap>(&scenario);
        assert!(admin::grantee(&admin_cap) == ADMIN);
        assert!(admin::granted_by(&admin_cap) == OWNER);
        test_scenario::return_to_sender(&scenario, admin_cap);
    };
    scenario.end();
}

#[test, expected_failure(abort_code = walrus_forms::form::EFormIdMismatch)]
fun test_grant_admin_wrong_cap() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_blob_id(), false, 2u8, scenario.ctx()); };

    // Capture form_a's ID
    scenario.next_tx(OWNER);
    let form_a_id: ID;
    {
        let cap_a = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        form_a_id = form::owner_cap_form_id(&cap_a);
        test_scenario::return_to_sender(&scenario, cap_a);
    };

    scenario.next_tx(@0xE);
    { form::create(valid_blob_id(), false, 2u8, scenario.ctx()); };

    // @0xE tries to use cap_b on form_a
    scenario.next_tx(@0xE);
    {
        let form_a = test_scenario::take_shared_by_id<Form>(&scenario, form_a_id);
        let cap_b = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        admin::grant_admin(&cap_b, &form_a, ADMIN, scenario.ctx());
        test_scenario::return_shared(form_a);
        test_scenario::return_to_sender(&scenario, cap_b);
    };
    scenario.end();
}

#[test]
fun test_revoke_admin_success() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_blob_id(), false, 2u8, scenario.ctx()); };

    scenario.next_tx(OWNER);
    {
        let form = test_scenario::take_shared<Form>(&scenario);
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        admin::grant_admin(&cap, &form, ADMIN, scenario.ctx());
        test_scenario::return_shared(form);
        test_scenario::return_to_sender(&scenario, cap);
    };

    // Admin transfers cap back to OWNER
    scenario.next_tx(ADMIN);
    {
        let admin_cap = test_scenario::take_from_sender<AdminCap>(&scenario);
        transfer::public_transfer(admin_cap, OWNER);
    };

    // Owner revokes
    scenario.next_tx(OWNER);
    {
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        let admin_cap = test_scenario::take_from_sender<AdminCap>(&scenario);
        admin::revoke_admin(&cap, admin_cap, scenario.ctx());
        test_scenario::return_to_sender(&scenario, cap);
    };

    // AdminCap no longer exists for ADMIN
    scenario.next_tx(ADMIN);
    {
        assert!(!test_scenario::has_most_recent_for_sender<AdminCap>(&scenario));
    };
    scenario.end();
}

#[test, expected_failure(abort_code = walrus_forms::admin::EAdminCapFormMismatch)]
fun test_revoke_admin_wrong_form() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_blob_id(), false, 2u8, scenario.ctx()); };

    scenario.next_tx(@0xF);
    { form::create(valid_blob_id(), false, 2u8, scenario.ctx()); };

    // Capture form_b's ID via @0xF's cap
    scenario.next_tx(@0xF);
    let form_b_id: ID;
    {
        let cap_b = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        form_b_id = form::owner_cap_form_id(&cap_b);
        test_scenario::return_to_sender(&scenario, cap_b);
    };

    // Grant admin on form B (using take_shared_by_id to get correct form)
    scenario.next_tx(@0xF);
    {
        let form_b = test_scenario::take_shared_by_id<Form>(&scenario, form_b_id);
        let cap_b = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        admin::grant_admin(&cap_b, &form_b, ADMIN, scenario.ctx());
        test_scenario::return_shared(form_b);
        test_scenario::return_to_sender(&scenario, cap_b);
    };

    // Admin sends cap to OWNER
    scenario.next_tx(ADMIN);
    {
        let admin_cap = test_scenario::take_from_sender<AdminCap>(&scenario);
        transfer::public_transfer(admin_cap, OWNER);
    };

    // OWNER tries to revoke admin_cap(form B) using cap_a(form A)
    scenario.next_tx(OWNER);
    {
        let cap_a = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        let admin_cap = test_scenario::take_from_sender<AdminCap>(&scenario);
        admin::revoke_admin(&cap_a, admin_cap, scenario.ctx());
        test_scenario::return_to_sender(&scenario, cap_a);
    };
    scenario.end();
}

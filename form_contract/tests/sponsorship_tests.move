#[test_only]
/// Tests for the sponsorship module.
module walrus_forms::sponsorship_tests;

use sui::test_scenario;
use walrus_forms::form::{Self, Form, FormOwnerCap};
use walrus_forms::sponsorship::{Self, SponsorshipPool};

const OWNER: address = @0xA;
const SPONSOR: address = @0xD;
const OTHER: address = @0xE;

fun valid_blob_id(): vector<u8> {
    vector[
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
        17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32
    ]
}

#[test]
fun test_create_sponsorship_pool_success() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_blob_id(), false, 0u8, scenario.ctx()); };

    scenario.next_tx(OWNER);
    {
        let form = test_scenario::take_shared<Form>(&scenario);
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        sponsorship::create_sponsorship_pool(&cap, &form, SPONSOR, scenario.ctx());
        test_scenario::return_shared(form);
        test_scenario::return_to_sender(&scenario, cap);
    };

    scenario.next_tx(OWNER);
    {
        let pool = test_scenario::take_from_sender<SponsorshipPool>(&scenario);
        assert!(sponsorship::sponsor_address(&pool) == SPONSOR);
        assert!(sponsorship::is_active(&pool));
        test_scenario::return_to_sender(&scenario, pool);
    };
    scenario.end();
}

#[test]
fun test_deactivate_and_reactivate_pool() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_blob_id(), false, 0u8, scenario.ctx()); };

    scenario.next_tx(OWNER);
    {
        let form = test_scenario::take_shared<Form>(&scenario);
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        sponsorship::create_sponsorship_pool(&cap, &form, SPONSOR, scenario.ctx());
        test_scenario::return_shared(form);
        test_scenario::return_to_sender(&scenario, cap);
    };

    scenario.next_tx(OWNER);
    {
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        let mut pool = test_scenario::take_from_sender<SponsorshipPool>(&scenario);
        sponsorship::deactivate_sponsorship_pool(&cap, &mut pool, scenario.ctx());
        assert!(!sponsorship::is_active(&pool));
        test_scenario::return_to_sender(&scenario, cap);
        test_scenario::return_to_sender(&scenario, pool);
    };

    scenario.next_tx(OWNER);
    {
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        let mut pool = test_scenario::take_from_sender<SponsorshipPool>(&scenario);
        sponsorship::reactivate_sponsorship_pool(&cap, &mut pool, scenario.ctx());
        assert!(sponsorship::is_active(&pool));
        test_scenario::return_to_sender(&scenario, cap);
        test_scenario::return_to_sender(&scenario, pool);
    };
    scenario.end();
}

#[test, expected_failure(abort_code = walrus_forms::sponsorship::ESponsorshipInactive)]
fun test_verify_sponsorship_inactive_pool_aborts() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_blob_id(), false, 0u8, scenario.ctx()); };

    scenario.next_tx(OWNER);
    {
        let form = test_scenario::take_shared<Form>(&scenario);
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        sponsorship::create_sponsorship_pool(&cap, &form, SPONSOR, scenario.ctx());
        test_scenario::return_shared(form);
        test_scenario::return_to_sender(&scenario, cap);
    };

    // Deactivate pool
    scenario.next_tx(OWNER);
    {
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        let mut pool = test_scenario::take_from_sender<SponsorshipPool>(&scenario);
        sponsorship::deactivate_sponsorship_pool(&cap, &mut pool, scenario.ctx());
        test_scenario::return_to_sender(&scenario, cap);
        test_scenario::return_to_sender(&scenario, pool);
    };

    // Try to verify sponsorship on inactive pool
    scenario.next_tx(OWNER);
    {
        let pool = test_scenario::take_from_sender<SponsorshipPool>(&scenario);
        sponsorship::verify_sponsorship(&pool, SPONSOR);
        test_scenario::return_to_sender(&scenario, pool);
    };
    scenario.end();
}

#[test, expected_failure(abort_code = walrus_forms::sponsorship::ESponsorMismatch)]
fun test_verify_sponsorship_wrong_address_aborts() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_blob_id(), false, 0u8, scenario.ctx()); };

    scenario.next_tx(OWNER);
    {
        let form = test_scenario::take_shared<Form>(&scenario);
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        sponsorship::create_sponsorship_pool(&cap, &form, SPONSOR, scenario.ctx());
        test_scenario::return_shared(form);
        test_scenario::return_to_sender(&scenario, cap);
    };

    scenario.next_tx(OWNER);
    {
        let pool = test_scenario::take_from_sender<SponsorshipPool>(&scenario);
        // Pass wrong address
        sponsorship::verify_sponsorship(&pool, OTHER);
        test_scenario::return_to_sender(&scenario, pool);
    };
    scenario.end();
}

#[test, expected_failure(abort_code = walrus_forms::sponsorship::EFormIdMismatch)]
fun test_deactivate_pool_wrong_cap_aborts() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_blob_id(), false, 0u8, scenario.ctx()); };

    scenario.next_tx(OWNER);
    let form_a_id: ID;
    {
        let cap_a = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        form_a_id = form::owner_cap_form_id(&cap_a);
        let form = test_scenario::take_shared_by_id<Form>(&scenario, form_a_id);
        sponsorship::create_sponsorship_pool(&cap_a, &form, SPONSOR, scenario.ctx());
        test_scenario::return_shared(form);
        test_scenario::return_to_sender(&scenario, cap_a);
    };

    // OTHER creates a different form
    scenario.next_tx(OTHER);
    { form::create(valid_blob_id(), false, 0u8, scenario.ctx()); };

    // OTHER uses their cap on OWNER's pool
    scenario.next_tx(OTHER);
    {
        let cap_b = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        let mut pool = test_scenario::take_from_address<SponsorshipPool>(&scenario, OWNER);
        sponsorship::deactivate_sponsorship_pool(&cap_b, &mut pool, scenario.ctx());
        test_scenario::return_to_sender(&scenario, cap_b);
        test_scenario::return_to_address(OWNER, pool);
    };
    scenario.end();
}

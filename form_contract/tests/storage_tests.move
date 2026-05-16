#[test_only]
/// Tests for the storage renewal module.
module walrus_forms::storage_tests;

use sui::test_scenario;
use walrus_forms::form::{Self, Form, FormOwnerCap};
use walrus_forms::storage::{Self, StorageRenewalRecord};

const OWNER: address = @0xA;
const OTHER: address = @0xB;

fun valid_schema_blob(): vector<u8> {
    vector[
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
        17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32
    ]
}

fun valid_renewal_blob(): vector<u8> {
    vector[
        99, 98, 97, 96, 95, 94, 93, 92, 91, 90, 89, 88, 87, 86, 85, 84,
        83, 82, 81, 80, 79, 78, 77, 76, 75, 74, 73, 72, 71, 70, 69, 68
    ]
}

#[test]
fun test_record_storage_renewal_success() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_schema_blob(), false, 2u8, scenario.ctx()); };

    scenario.next_tx(OWNER);
    {
        let form = test_scenario::take_shared<Form>(&scenario);
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        storage::record_storage_renewal(&cap, &form, valid_renewal_blob(), 52, scenario.ctx());
        test_scenario::return_shared(form);
        test_scenario::return_to_sender(&scenario, cap);
    };

    scenario.next_tx(OWNER);
    {
        let record = test_scenario::take_from_sender<StorageRenewalRecord>(&scenario);
        assert!(storage::blob_id(&record) == valid_renewal_blob());
        assert!(storage::epochs_extended(&record) == 52);
        assert!(storage::renewed_by(&record) == OWNER);
        test_scenario::return_to_sender(&scenario, record);
    };
    scenario.end();
}

#[test, expected_failure(abort_code = walrus_forms::storage::EInvalidBlobIdLength)]
fun test_record_renewal_invalid_blob_id_aborts() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_schema_blob(), false, 2u8, scenario.ctx()); };

    scenario.next_tx(OWNER);
    {
        let form = test_scenario::take_shared<Form>(&scenario);
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        // Short blob ID — invalid
        storage::record_storage_renewal(&cap, &form, vector[1, 2, 3], 10, scenario.ctx());
        test_scenario::return_shared(form);
        test_scenario::return_to_sender(&scenario, cap);
    };
    scenario.end();
}

#[test, expected_failure(abort_code = walrus_forms::form::EFormIdMismatch)]
fun test_record_renewal_wrong_cap_aborts() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_schema_blob(), false, 2u8, scenario.ctx()); };

    scenario.next_tx(OWNER);
    let form_a_id: ID;
    {
        let cap_a = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        form_a_id = form::owner_cap_form_id(&cap_a);
        test_scenario::return_to_sender(&scenario, cap_a);
    };

    scenario.next_tx(OTHER);
    { form::create(valid_schema_blob(), false, 2u8, scenario.ctx()); };

    scenario.next_tx(OTHER);
    {
        let form_a = test_scenario::take_shared_by_id<Form>(&scenario, form_a_id);
        let cap_b = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        storage::record_storage_renewal(&cap_b, &form_a, valid_renewal_blob(), 10, scenario.ctx());
        test_scenario::return_shared(form_a);
        test_scenario::return_to_sender(&scenario, cap_b);
    };
    scenario.end();
}

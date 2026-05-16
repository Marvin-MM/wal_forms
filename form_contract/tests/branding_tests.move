#[test_only]
/// Tests for the branding module.
module walrus_forms::branding_tests;

use std::string;
use sui::test_scenario;
use walrus_forms::branding::{Self, BrandingAsset};
use walrus_forms::form::{Self, Form, FormOwnerCap};

const OWNER: address = @0xA;
const OTHER: address = @0xB;

fun valid_schema_blob(): vector<u8> {
    vector[
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
        17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32
    ]
}

fun valid_asset_blob(): vector<u8> {
    vector[
        99, 98, 97, 96, 95, 94, 93, 92, 91, 90, 89, 88, 87, 86, 85, 84,
        83, 82, 81, 80, 79, 78, 77, 76, 75, 74, 73, 72, 71, 70, 69, 68
    ]
}

fun updated_asset_blob(): vector<u8> {
    vector[
        10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160,
        11, 21, 31, 41, 51, 61, 71, 81, 91, 101, 111, 121, 131, 141, 151, 161
    ]
}

#[test]
fun test_register_branding_asset_success() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_schema_blob(), false, 2u8, scenario.ctx()); };

    scenario.next_tx(OWNER);
    {
        let form = test_scenario::take_shared<Form>(&scenario);
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        branding::register_branding_asset(
            &cap,
            &form,
            0u8, // ASSET_LOGO
            valid_asset_blob(),
            string::utf8(b"image/png"),
            scenario.ctx(),
        );
        test_scenario::return_shared(form);
        test_scenario::return_to_sender(&scenario, cap);
    };

    scenario.next_tx(OWNER);
    {
        let asset = test_scenario::take_from_sender<BrandingAsset>(&scenario);
        assert!(branding::asset_type(&asset) == 0);
        assert!(branding::blob_id(&asset) == valid_asset_blob());
        assert!(branding::mime_type_hint(&asset) == string::utf8(b"image/png"));
        assert!(branding::owner(&asset) == OWNER);
        test_scenario::return_to_sender(&scenario, asset);
    };
    scenario.end();
}

#[test]
fun test_register_all_asset_types() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_schema_blob(), false, 2u8, scenario.ctx()); };

    scenario.next_tx(OWNER);
    {
        let form = test_scenario::take_shared<Form>(&scenario);
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        branding::register_branding_asset(&cap, &form, 0u8, valid_asset_blob(), string::utf8(b"image/png"), scenario.ctx());
        branding::register_branding_asset(&cap, &form, 1u8, valid_asset_blob(), string::utf8(b"image/jpeg"), scenario.ctx());
        branding::register_branding_asset(&cap, &form, 2u8, valid_asset_blob(), string::utf8(b"image/x-icon"), scenario.ctx());
        test_scenario::return_shared(form);
        test_scenario::return_to_sender(&scenario, cap);
    };
    scenario.end();
}

#[test, expected_failure(abort_code = walrus_forms::branding::EInvalidBlobIdLength)]
fun test_register_asset_invalid_blob_id() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_schema_blob(), false, 2u8, scenario.ctx()); };

    scenario.next_tx(OWNER);
    {
        let form = test_scenario::take_shared<Form>(&scenario);
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        branding::register_branding_asset(
            &cap, &form, 0u8, vector[1, 2, 3], string::utf8(b"image/png"), scenario.ctx(),
        );
        test_scenario::return_shared(form);
        test_scenario::return_to_sender(&scenario, cap);
    };
    scenario.end();
}

#[test, expected_failure(abort_code = walrus_forms::branding::EInvalidAssetType)]
fun test_register_asset_invalid_type() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_schema_blob(), false, 2u8, scenario.ctx()); };

    scenario.next_tx(OWNER);
    {
        let form = test_scenario::take_shared<Form>(&scenario);
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        branding::register_branding_asset(
            &cap, &form, 99u8, valid_asset_blob(), string::utf8(b"image/png"), scenario.ctx(),
        );
        test_scenario::return_shared(form);
        test_scenario::return_to_sender(&scenario, cap);
    };
    scenario.end();
}

#[test, expected_failure(abort_code = walrus_forms::branding::EInvalidMimeType)]
fun test_register_asset_invalid_mime_type() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_schema_blob(), false, 2u8, scenario.ctx()); };

    scenario.next_tx(OWNER);
    {
        let form = test_scenario::take_shared<Form>(&scenario);
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        branding::register_branding_asset(
            &cap, &form, 0u8, valid_asset_blob(), string::utf8(b"application/pdf"), scenario.ctx(),
        );
        test_scenario::return_shared(form);
        test_scenario::return_to_sender(&scenario, cap);
    };
    scenario.end();
}

#[test, expected_failure(abort_code = walrus_forms::form::EFormIdMismatch)]
fun test_register_asset_wrong_cap() {
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
        branding::register_branding_asset(
            &cap_b, &form_a, 0u8, valid_asset_blob(), string::utf8(b"image/png"), scenario.ctx(),
        );
        test_scenario::return_shared(form_a);
        test_scenario::return_to_sender(&scenario, cap_b);
    };
    scenario.end();
}

#[test]
fun test_update_branding_asset() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_schema_blob(), false, 2u8, scenario.ctx()); };

    scenario.next_tx(OWNER);
    {
        let form = test_scenario::take_shared<Form>(&scenario);
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        branding::register_branding_asset(
            &cap, &form, 0u8, valid_asset_blob(), string::utf8(b"image/png"), scenario.ctx(),
        );
        test_scenario::return_shared(form);
        test_scenario::return_to_sender(&scenario, cap);
    };

    scenario.next_tx(OWNER);
    {
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        let mut asset = test_scenario::take_from_sender<BrandingAsset>(&scenario);
        branding::update_branding_asset(&cap, &mut asset, updated_asset_blob(), scenario.ctx());
        assert!(branding::blob_id(&asset) == updated_asset_blob());
        test_scenario::return_to_sender(&scenario, cap);
        test_scenario::return_to_sender(&scenario, asset);
    };
    scenario.end();
}

#[test]
fun test_remove_branding_asset() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_schema_blob(), false, 2u8, scenario.ctx()); };

    scenario.next_tx(OWNER);
    {
        let form = test_scenario::take_shared<Form>(&scenario);
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        branding::register_branding_asset(
            &cap, &form, 0u8, valid_asset_blob(), string::utf8(b"image/png"), scenario.ctx(),
        );
        test_scenario::return_shared(form);
        test_scenario::return_to_sender(&scenario, cap);
    };

    scenario.next_tx(OWNER);
    {
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        let asset = test_scenario::take_from_sender<BrandingAsset>(&scenario);
        branding::remove_branding_asset(&cap, asset, scenario.ctx());
        test_scenario::return_to_sender(&scenario, cap);
    };

    // Asset no longer exists
    scenario.next_tx(OWNER);
    {
        assert!(!test_scenario::has_most_recent_for_sender<BrandingAsset>(&scenario));
    };
    scenario.end();
}

#[test, expected_failure(abort_code = walrus_forms::branding::EBrandingCapMismatch)]
fun test_update_asset_cap_confusion_aborts() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_schema_blob(), false, 2u8, scenario.ctx()); };

    scenario.next_tx(OWNER);
    {
        let form = test_scenario::take_shared<Form>(&scenario);
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        branding::register_branding_asset(
            &cap, &form, 0u8, valid_asset_blob(), string::utf8(b"image/png"), scenario.ctx(),
        );
        test_scenario::return_shared(form);
        test_scenario::return_to_sender(&scenario, cap);
    };

    // OTHER creates their own form and cap
    scenario.next_tx(OTHER);
    { form::create(valid_schema_blob(), false, 2u8, scenario.ctx()); };

    // OTHER tries to update OWNER's asset using their own cap
    scenario.next_tx(OTHER);
    {
        let cap_other = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        let mut asset = test_scenario::take_from_address<BrandingAsset>(&scenario, OWNER);
        branding::update_branding_asset(&cap_other, &mut asset, updated_asset_blob(), scenario.ctx());
        test_scenario::return_to_sender(&scenario, cap_other);
        test_scenario::return_to_address(OWNER, asset);
    };
    scenario.end();
}

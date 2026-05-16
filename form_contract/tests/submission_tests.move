#[test_only]
/// Tests for the submission module covering all four entry functions.
module walrus_forms::submission_tests;

use sui::test_scenario;
use walrus_forms::form::{Self, Form, FormOwnerCap};
use walrus_forms::submission::{Self, SubmissionReceipt};
use walrus_forms::sponsorship::{Self, SponsorshipPool};

const OWNER: address = @0xA;
const SUBMITTER: address = @0xC;
const SPONSOR: address = @0xD;

const IDENTITY_ANONYMOUS: u8 = 0;
const IDENTITY_OPTIONAL: u8 = 1;
const IDENTITY_REQUIRED: u8 = 2;

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

// ─── submit ─────────────────────────────────────────────────────────────

#[test]
fun test_submit_success() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_blob_id(), false, IDENTITY_REQUIRED, scenario.ctx()); };

    scenario.next_tx(SUBMITTER);
    {
        let mut form = test_scenario::take_shared<Form>(&scenario);
        submission::submit(&mut form, sub_blob(), false, scenario.ctx());
        assert!(form::submission_count(&form) == 1);
        test_scenario::return_shared(form);
    };

    scenario.next_tx(SUBMITTER);
    {
        let receipt = test_scenario::take_from_sender<SubmissionReceipt>(&scenario);
        assert!(submission::blob_id(&receipt) == sub_blob());
        // submitter is now Option<address>
        assert!(submission::submitter(&receipt) == option::some(SUBMITTER));
        assert!(submission::schema_version_at_submission(&receipt) == 0);
        assert!(!submission::is_encrypted(&receipt));
        assert!(submission::identity_mode(&receipt) == IDENTITY_REQUIRED);
        assert!(!submission::is_sponsored(&receipt));
        assert!(submission::form_owner_at_submission(&receipt) == OWNER);
        test_scenario::return_to_sender(&scenario, receipt);
    };
    scenario.end();
}

#[test]
fun test_submit_encrypted() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_blob_id(), true, IDENTITY_REQUIRED, scenario.ctx()); };

    scenario.next_tx(SUBMITTER);
    {
        let mut form = test_scenario::take_shared<Form>(&scenario);
        submission::submit(&mut form, sub_blob(), true, scenario.ctx());
        test_scenario::return_shared(form);
    };

    scenario.next_tx(SUBMITTER);
    {
        let receipt = test_scenario::take_from_sender<SubmissionReceipt>(&scenario);
        assert!(submission::is_encrypted(&receipt));
        test_scenario::return_to_sender(&scenario, receipt);
    };
    scenario.end();
}

#[test]
fun test_submission_count_increments() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_blob_id(), false, IDENTITY_REQUIRED, scenario.ctx()); };

    scenario.next_tx(SUBMITTER);
    {
        let mut form = test_scenario::take_shared<Form>(&scenario);
        submission::submit(&mut form, sub_blob(), false, scenario.ctx());
        submission::submit(&mut form, sub_blob(), false, scenario.ctx());
        submission::submit(&mut form, sub_blob(), false, scenario.ctx());
        assert!(form::submission_count(&form) == 3);
        test_scenario::return_shared(form);
    };
    scenario.end();
}

#[test]
fun test_schema_version_captured_at_submission() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_blob_id(), false, IDENTITY_REQUIRED, scenario.ctx()); };

    scenario.next_tx(OWNER);
    {
        let mut form = test_scenario::take_shared<Form>(&scenario);
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        let new_blob = vector[
            50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65,
            66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81
        ];
        form::update_schema(&mut form, &cap, new_blob, scenario.ctx());
        assert!(form::schema_version(&form) == 1);
        test_scenario::return_shared(form);
        test_scenario::return_to_sender(&scenario, cap);
    };

    scenario.next_tx(SUBMITTER);
    {
        let mut form = test_scenario::take_shared<Form>(&scenario);
        submission::submit(&mut form, sub_blob(), false, scenario.ctx());
        test_scenario::return_shared(form);
    };

    scenario.next_tx(SUBMITTER);
    {
        let receipt = test_scenario::take_from_sender<SubmissionReceipt>(&scenario);
        assert!(submission::schema_version_at_submission(&receipt) == 1);
        test_scenario::return_to_sender(&scenario, receipt);
    };
    scenario.end();
}

#[test, expected_failure(abort_code = walrus_forms::submission::EFormClosed)]
fun test_submit_to_closed_form() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_blob_id(), false, IDENTITY_REQUIRED, scenario.ctx()); };

    scenario.next_tx(OWNER);
    {
        let mut form = test_scenario::take_shared<Form>(&scenario);
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        form::close_form(&mut form, &cap, scenario.ctx());
        test_scenario::return_shared(form);
        test_scenario::return_to_sender(&scenario, cap);
    };

    scenario.next_tx(SUBMITTER);
    {
        let mut form = test_scenario::take_shared<Form>(&scenario);
        submission::submit(&mut form, sub_blob(), false, scenario.ctx());
        test_scenario::return_shared(form);
    };
    scenario.end();
}

#[test]
fun test_submit_after_reopen() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_blob_id(), false, IDENTITY_REQUIRED, scenario.ctx()); };

    scenario.next_tx(OWNER);
    {
        let mut form = test_scenario::take_shared<Form>(&scenario);
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        form::close_form(&mut form, &cap, scenario.ctx());
        test_scenario::return_shared(form);
        test_scenario::return_to_sender(&scenario, cap);
    };

    scenario.next_tx(OWNER);
    {
        let mut form = test_scenario::take_shared<Form>(&scenario);
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        form::reopen_form(&mut form, &cap, scenario.ctx());
        test_scenario::return_shared(form);
        test_scenario::return_to_sender(&scenario, cap);
    };

    scenario.next_tx(SUBMITTER);
    {
        let mut form = test_scenario::take_shared<Form>(&scenario);
        submission::submit(&mut form, sub_blob(), false, scenario.ctx());
        assert!(form::submission_count(&form) == 1);
        test_scenario::return_shared(form);
    };
    scenario.end();
}

#[test, expected_failure(abort_code = walrus_forms::submission::EInvalidBlobIdLength)]
fun test_submit_invalid_blob_id() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_blob_id(), false, IDENTITY_REQUIRED, scenario.ctx()); };

    scenario.next_tx(SUBMITTER);
    {
        let mut form = test_scenario::take_shared<Form>(&scenario);
        submission::submit(&mut form, vector[1, 2, 3], false, scenario.ctx());
        test_scenario::return_shared(form);
    };
    scenario.end();
}

// ─── submit_anonymous ───────────────────────────────────────────────────

#[test]
fun test_submit_anonymous_sets_submitter_none() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_blob_id(), false, IDENTITY_ANONYMOUS, scenario.ctx()); };

    // Create sponsorship pool
    scenario.next_tx(OWNER);
    {
        let form = test_scenario::take_shared<Form>(&scenario);
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        sponsorship::create_sponsorship_pool(&cap, &form, SPONSOR, scenario.ctx());
        test_scenario::return_shared(form);
        test_scenario::return_to_sender(&scenario, cap);
    };

    // Sponsor submits on behalf of anonymous user
    scenario.next_tx(SPONSOR);
    {
        let mut form = test_scenario::take_shared<Form>(&scenario);
        let pool = test_scenario::take_from_address<SponsorshipPool>(&scenario, OWNER);
        submission::submit_anonymous(
            &mut form,
            sub_blob(),
            false,
            option::none(),  // no submitter address
            SPONSOR,
            &pool,
            scenario.ctx(),
        );
        assert!(form::submission_count(&form) == 1);
        test_scenario::return_shared(form);
        test_scenario::return_to_address(OWNER, pool);
    };

    // Receipt is owned by SPONSOR (the sender)
    scenario.next_tx(SPONSOR);
    {
        let receipt = test_scenario::take_from_sender<SubmissionReceipt>(&scenario);
        assert!(submission::submitter(&receipt).is_none());
        assert!(submission::identity_mode(&receipt) == IDENTITY_ANONYMOUS);
        test_scenario::return_to_sender(&scenario, receipt);
    };
    scenario.end();
}

#[test]
fun test_submit_optional_connected_records_address() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_blob_id(), false, IDENTITY_OPTIONAL, scenario.ctx()); };

    scenario.next_tx(OWNER);
    {
        let form = test_scenario::take_shared<Form>(&scenario);
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        sponsorship::create_sponsorship_pool(&cap, &form, SPONSOR, scenario.ctx());
        test_scenario::return_shared(form);
        test_scenario::return_to_sender(&scenario, cap);
    };

    scenario.next_tx(SPONSOR);
    {
        let mut form = test_scenario::take_shared<Form>(&scenario);
        let pool = test_scenario::take_from_address<SponsorshipPool>(&scenario, OWNER);
        submission::submit_anonymous(
            &mut form,
            sub_blob(),
            false,
            option::some(SUBMITTER),  // optional address provided
            SPONSOR,
            &pool,
            scenario.ctx(),
        );
        test_scenario::return_shared(form);
        test_scenario::return_to_address(OWNER, pool);
    };

    scenario.next_tx(SPONSOR);
    {
        let receipt = test_scenario::take_from_sender<SubmissionReceipt>(&scenario);
        assert!(submission::submitter(&receipt) == option::some(SUBMITTER));
        assert!(submission::identity_mode(&receipt) == IDENTITY_OPTIONAL);
        test_scenario::return_to_sender(&scenario, receipt);
    };
    scenario.end();
}

#[test, expected_failure(abort_code = walrus_forms::submission::EInvalidIdentityMode)]
fun test_submit_anonymous_on_required_form_aborts() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_blob_id(), false, IDENTITY_REQUIRED, scenario.ctx()); };

    scenario.next_tx(OWNER);
    {
        let form = test_scenario::take_shared<Form>(&scenario);
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        sponsorship::create_sponsorship_pool(&cap, &form, SPONSOR, scenario.ctx());
        test_scenario::return_shared(form);
        test_scenario::return_to_sender(&scenario, cap);
    };

    scenario.next_tx(SPONSOR);
    {
        let mut form = test_scenario::take_shared<Form>(&scenario);
        let pool = test_scenario::take_from_address<SponsorshipPool>(&scenario, OWNER);
        submission::submit_anonymous(
            &mut form, sub_blob(), false, option::none(), SPONSOR, &pool, scenario.ctx(),
        );
        test_scenario::return_shared(form);
        test_scenario::return_to_address(OWNER, pool);
    };
    scenario.end();
}

#[test, expected_failure(abort_code = walrus_forms::sponsorship::ESponsorMismatch)]
fun test_submit_anonymous_wrong_sponsor_aborts() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_blob_id(), false, IDENTITY_ANONYMOUS, scenario.ctx()); };

    scenario.next_tx(OWNER);
    {
        let form = test_scenario::take_shared<Form>(&scenario);
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        sponsorship::create_sponsorship_pool(&cap, &form, SPONSOR, scenario.ctx());
        test_scenario::return_shared(form);
        test_scenario::return_to_sender(&scenario, cap);
    };

    scenario.next_tx(SPONSOR);
    {
        let mut form = test_scenario::take_shared<Form>(&scenario);
        let pool = test_scenario::take_from_address<SponsorshipPool>(&scenario, OWNER);
        // Pass wrong sponsor address — mismatch with pool
        submission::submit_anonymous(
            &mut form, sub_blob(), false, option::none(), @0xBAD, &pool, scenario.ctx(),
        );
        test_scenario::return_shared(form);
        test_scenario::return_to_address(OWNER, pool);
    };
    scenario.end();
}

// ─── request_deletion ───────────────────────────────────────────────────

#[test]
fun test_request_deletion_success() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_blob_id(), false, IDENTITY_REQUIRED, scenario.ctx()); };

    scenario.next_tx(SUBMITTER);
    {
        let mut form = test_scenario::take_shared<Form>(&scenario);
        submission::submit(&mut form, sub_blob(), false, scenario.ctx());
        test_scenario::return_shared(form);
    };

    scenario.next_tx(SUBMITTER);
    {
        let receipt = test_scenario::take_from_sender<SubmissionReceipt>(&scenario);
        submission::request_deletion(&receipt, scenario.ctx());
        test_scenario::return_to_sender(&scenario, receipt);
    };

    // DeletionRequest routed to OWNER (form owner at submission time)
    scenario.next_tx(OWNER);
    {
        assert!(test_scenario::has_most_recent_for_sender<walrus_forms::submission::DeletionRequest>(&scenario));
    };
    scenario.end();
}

#[test, expected_failure(abort_code = walrus_forms::submission::ENotSubmitter)]
fun test_request_deletion_wrong_sender_aborts() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_blob_id(), false, IDENTITY_REQUIRED, scenario.ctx()); };

    scenario.next_tx(SUBMITTER);
    {
        let mut form = test_scenario::take_shared<Form>(&scenario);
        submission::submit(&mut form, sub_blob(), false, scenario.ctx());
        test_scenario::return_shared(form);
    };

    // Transfer receipt to OWNER so OWNER can attempt deletion
    scenario.next_tx(SUBMITTER);
    {
        let receipt = test_scenario::take_from_sender<SubmissionReceipt>(&scenario);
        // OWNER attempts deletion — not the submitter
        // We test by having the wrong address call it
        // (We pass it back and have the OWNER try in next tx)
        test_scenario::return_to_sender(&scenario, receipt);
    };

    // OWNER tries to call request_deletion on SUBMITTER's receipt
    // But OWNER doesn't have the receipt object — so we simulate by
    // having another address call with a shared reference trick.
    // In practice, the receipt is an owned object so only SUBMITTER can pass it.
    // This test verifies the abort by having the sender be OWNER acting
    // as if they had the receipt (they cannot in practice, but we test via
    // the same-tx sender check).
    scenario.next_tx(OWNER);
    {
        // Use take_from_address to simulate having access to the receipt
        let receipt = test_scenario::take_from_address<SubmissionReceipt>(&scenario, SUBMITTER);
        submission::request_deletion(&receipt, scenario.ctx());
        test_scenario::return_to_address(SUBMITTER, receipt);
    };
    scenario.end();
}

#[test, expected_failure(abort_code = walrus_forms::submission::ENotSubmitter)]
fun test_request_deletion_anonymous_aborts() {
    let mut scenario = test_scenario::begin(OWNER);
    { form::create(valid_blob_id(), false, IDENTITY_ANONYMOUS, scenario.ctx()); };

    scenario.next_tx(OWNER);
    {
        let form = test_scenario::take_shared<Form>(&scenario);
        let cap = test_scenario::take_from_sender<FormOwnerCap>(&scenario);
        sponsorship::create_sponsorship_pool(&cap, &form, SPONSOR, scenario.ctx());
        test_scenario::return_shared(form);
        test_scenario::return_to_sender(&scenario, cap);
    };

    scenario.next_tx(SPONSOR);
    {
        let mut form = test_scenario::take_shared<Form>(&scenario);
        let pool = test_scenario::take_from_address<SponsorshipPool>(&scenario, OWNER);
        submission::submit_anonymous(
            &mut form, sub_blob(), false, option::none(), SPONSOR, &pool, scenario.ctx(),
        );
        test_scenario::return_shared(form);
        test_scenario::return_to_address(OWNER, pool);
    };

    // Try to request deletion on an anonymous receipt — must abort
    scenario.next_tx(SPONSOR);
    {
        let receipt = test_scenario::take_from_sender<SubmissionReceipt>(&scenario);
        submission::request_deletion(&receipt, scenario.ctx());
        test_scenario::return_to_sender(&scenario, receipt);
    };
    scenario.end();
}

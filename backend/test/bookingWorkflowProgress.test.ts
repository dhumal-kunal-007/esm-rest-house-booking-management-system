import assert from "node:assert/strict";
import test from "node:test";

import {
    hasCompleteAcceptedAccommodations,
    resolveResumableBookingStep,
} from "../src/services/bookingWorkflowProgress.js";

test("requires an accepted accommodation for every expected guest", () => {
    assert.equal(hasCompleteAcceptedAccommodations(1, 2), false);
    assert.equal(hasCompleteAcceptedAccommodations(2, 2), true);
    assert.equal(hasCompleteAcceptedAccommodations(3, 2), false);
    assert.equal(hasCompleteAcceptedAccommodations(0, 0), false);
});

test("resumes at availability when not every guest has an accepted accommodation", () => {
    assert.equal(
        resolveResumableBookingStep({
            acceptedGuestCount: 1,
            requiredGuestCount: 2,
            storedStep: "RATE",
            hasPricing: false,
        }),
        "AVAILABILITY"
    );
});

test("restores saved guest type and rate steps ahead of old pricing snapshots", () => {
    assert.equal(
        resolveResumableBookingStep({
            acceptedGuestCount: 1,
            requiredGuestCount: 1,
            storedStep: "GUEST_TYPE",
            hasPricing: true,
        }),
        "GUEST_TYPE"
    );
    assert.equal(
        resolveResumableBookingStep({
            acceptedGuestCount: 1,
            requiredGuestCount: 1,
            storedStep: "RATE",
            hasPricing: true,
        }),
        "RATE"
    );
});

test("resumes at confirmation when pricing was saved but submission is unfinished", () => {
    assert.equal(
        resolveResumableBookingStep({
            acceptedGuestCount: 1,
            requiredGuestCount: 1,
            storedStep: "BOOKING_CONFIRMATION",
            hasPricing: true,
        }),
        "BOOKING_CONFIRMATION"
    );
});

test("does not treat a legacy booking with a pricing snapshot as incomplete without saved progress", () => {
    assert.equal(
        resolveResumableBookingStep({
            acceptedGuestCount: 1,
            requiredGuestCount: 1,
            storedStep: null,
            hasPricing: true,
        }),
        null
    );
});

test("recovers a completed-step draft to confirmation while it is pending approval", () => {
    assert.equal(
        resolveResumableBookingStep({
            acceptedGuestCount: 1,
            requiredGuestCount: 1,
            storedStep: "COMPLETED",
            hasPricing: true,
        }),
        "BOOKING_CONFIRMATION"
    );
});

import assert from "node:assert/strict";
import test from "node:test";

import {
  BookingPricingInputError,
  calculateBookingPricing,
  roomRateColumnForGuestType,
} from "../src/services/bookingPricing.js";

test("selects an independent configured room rate for each guest type", () => {
  assert.equal(roomRateColumnForGuestType("CIVILIAN"), "civilian_room_rate");
  assert.equal(roomRateColumnForGuestType("ESM"), "esm_room_rate");
  assert.equal(roomRateColumnForGuestType("SERVING"), "serving_room_rate");
});

test("calculates room rates from guest type and duration", () => {
  const pricing = calculateBookingPricing({
    guestType: "ESM",
    accommodationCategory: "AC",
    checkInDate: "2026-10-01",
    checkOutDate: "2026-10-04",
    roomCount: 2,
    unitRates: [500, 500],
  });

  assert.equal(pricing.accommodationDays, 3);
  assert.equal(pricing.accommodationRate, 500);
  assert.equal(pricing.accommodationAmount, 3000);
  assert.equal(pricing.totalAmount, 3000);
});

test("charges a room rate once for multiple occupants using beds in one room", () => {
  for (const guestType of ["SERVING", "CIVILIAN"] as const) {
    const pricing = calculateBookingPricing({
      guestType,
      accommodationCategory: "DORMITORY",
      checkInDate: "2026-10-01",
      checkOutDate: "2026-10-02",
      roomCount: 1,
      unitRates: [100],
    });

    assert.equal(pricing.accommodationRate, 100);
    assert.equal(pricing.totalAmount, 100);
  }
});

test("rejects invalid dates and zero accommodation units", () => {
  assert.throws(
    () =>
      calculateBookingPricing({
        guestType: "ESM",
        accommodationCategory: "NON_AC",
        checkInDate: "2026-02-30",
        checkOutDate: "2026-03-02",
        roomCount: 1,
        unitRates: [100],
      }),
    BookingPricingInputError
  );

  assert.throws(
    () =>
      calculateBookingPricing({
        guestType: "ESM",
        accommodationCategory: "HALL",
        checkInDate: "2026-10-01",
        checkOutDate: "2026-10-02",
        roomCount: 0,
        unitRates: [],
      }),
    BookingPricingInputError
  );
});

test("uses configured per-room rates and refuses incomplete rate cards", () => {
  const pricing = calculateBookingPricing({
    guestType: "ESM",
    accommodationCategory: "AC",
    checkInDate: "2026-10-01",
    checkOutDate: "2026-10-03",
    roomCount: 2,
    unitRates: [100, 250],
  });

  assert.equal(pricing.accommodationRate, 175);
  assert.equal(pricing.accommodationAmount, 700);

  assert.throws(
    () =>
      calculateBookingPricing({
        guestType: "ESM",
        accommodationCategory: "AC",
        checkInDate: "2026-10-01",
        checkOutDate: "2026-10-02",
        roomCount: 1,
        unitRates: [Number.NaN],
      }),
    BookingPricingInputError
  );
});

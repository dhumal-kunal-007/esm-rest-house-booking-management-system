import assert from "node:assert/strict";
import test from "node:test";
import {
  validateLegacyBillRateOverride,
} from "../src/services/legacyBillRateValidation.js";

test("reports legacy pricing as required when no override values are present", () => {
  const result = validateLegacyBillRateOverride({
    legacyDailyRate: undefined,
    legacyGuestType: undefined,
    legacyAuthorizationReason: undefined,
    confirmLegacyRate: undefined,
    userRole: "ADMIN",
  });

  assert.equal(result.isRequired, true);
  assert.equal(result.isValid, false);
  assert.match(
    result.error ?? "",
    /ADMIN must enter and confirm/i
  );
});

test("rejects a legacy rate when the caller is not ADMIN", () => {
  const result = validateLegacyBillRateOverride({
    legacyDailyRate: 1200,
    legacyGuestType: "ESM",
    legacyAuthorizationReason: "Official government tariff as per historical record.",
    confirmLegacyRate: true,
    userRole: "RECEPTIONIST",
  });

  assert.equal(result.isRequired, false);
  assert.equal(result.isValid, false);
  assert.match(result.error ?? "", /Only an ADMIN/i);
});

test("accepts a valid admin override for a legacy rate", () => {
  const result = validateLegacyBillRateOverride({
    legacyDailyRate: 1250.5,
    legacyGuestType: "serving",
    legacyAuthorizationReason: "Official historical rate approved by the deputy commissioner for this booking.",
    confirmLegacyRate: true,
    userRole: "ADMIN",
  });

  assert.equal(result.isRequired, false);
  assert.equal(result.isValid, true);
  assert.equal(result.normalizedRate, 1250.5);
  assert.equal(result.normalizedGuestType, "SERVING");
  assert.equal(
    result.normalizedAuthorizationReason,
    "Official historical rate approved by the deputy commissioner for this booking."
  );
});

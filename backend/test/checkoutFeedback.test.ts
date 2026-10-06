import assert from "node:assert/strict";
import test from "node:test";
import { areCheckoutFeedbackRatingsValid } from "../src/services/checkoutFeedback.js";

test("accepts five whole-number ratings from one through five", () => {
  assert.equal(
    areCheckoutFeedbackRatingsValid([1, 2, 3, 4, 5]),
    true
  );
});

test("rejects missing, out-of-range, and fractional feedback ratings", () => {
  assert.equal(
    areCheckoutFeedbackRatingsValid([1, 2, 3, 4]),
    false
  );
  assert.equal(
    areCheckoutFeedbackRatingsValid([1, 2, 3, 4, 6]),
    false
  );
  assert.equal(
    areCheckoutFeedbackRatingsValid([1, 2, 3, 4, 4.5]),
    false
  );
});

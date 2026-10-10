import assert from "node:assert/strict";
import test from "node:test";

import { resolveActualCheckInTimestamp } from "../src/services/checkInAccounting.js";

test("manual pre-checkin keeps the guest's actual arrival date for accounting", () => {
  const actualCheckIn = resolveActualCheckInTimestamp("2026-10-08", "14:30");

  assert.equal(actualCheckIn, "2026-10-08T14:30:00.000Z");
});

test("manual pre-checkin rejects invalid calendar dates", () => {
  assert.throws(
    () => resolveActualCheckInTimestamp("2026-02-30", "14:30"),
    /invalid check-in date/i
  );
});

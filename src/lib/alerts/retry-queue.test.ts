import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MAX_DELIVERY_ATTEMPTS,
  nextAttemptAt,
  RETRY_BACKOFF_MINUTES,
} from "@/lib/alerts/retry-queue";

const T0 = new Date("2026-08-09T12:00:00.000Z");

describe("nextAttemptAt", () => {
  it("uses the front-loaded schedule", () => {
    assert.equal(
      nextAttemptAt(0, T0)?.toISOString(),
      "2026-08-09T12:01:00.000Z"
    );
    assert.equal(
      nextAttemptAt(1, T0)?.toISOString(),
      "2026-08-09T12:05:00.000Z"
    );
    assert.equal(
      nextAttemptAt(2, T0)?.toISOString(),
      "2026-08-09T12:15:00.000Z"
    );
  });

  it("increases monotonically", () => {
    let previous = 0;
    for (let attempts = 0; attempts < RETRY_BACKOFF_MINUTES.length; attempts++) {
      const due = nextAttemptAt(attempts, T0);
      assert.ok(due, `attempt ${attempts} should have a next slot`);
      const delta = due.getTime() - T0.getTime();
      assert.ok(delta > previous, `attempt ${attempts} must back off further`);
      previous = delta;
    }
  });

  it("returns null once the budget is exhausted", () => {
    // The dead-letter signal: a permanently bad destination must stop
    // consuming attempts rather than retrying forever.
    assert.equal(nextAttemptAt(MAX_DELIVERY_ATTEMPTS, T0), null);
    assert.equal(nextAttemptAt(MAX_DELIVERY_ATTEMPTS + 5, T0), null);
  });

  it("spans a working day before giving up", () => {
    const total = RETRY_BACKOFF_MINUTES.reduce((a, b) => a + b, 0);
    assert.ok(
      total >= 180,
      `retry window should cover a multi-hour outage, got ${total} minutes`
    );
  });
});

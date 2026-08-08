import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  MAX_CONSECUTIVE_FAILURES,
  isFrequency,
  nextRunAt,
  retryRunAt,
} from "./schedule-cadence";

describe("nextRunAt", () => {
  it("anchors on the due slot, not on now, so cadence does not drift", () => {
    // Due at 12:00 but the worker only got to it at 12:04.
    const due = "2026-03-10T12:00:00.000Z";
    const now = new Date("2026-03-10T12:04:37.000Z");
    assert.equal(nextRunAt("HOURLY", due, now), "2026-03-10T13:00:00.000Z");
  });

  it("does not accumulate latency across many ticks", () => {
    let anchor = "2026-03-10T00:00:00.000Z";
    for (let i = 0; i < 24; i += 1) {
      // Each tick runs a few seconds late.
      const now = new Date(new Date(anchor).getTime() + 47_000);
      anchor = nextRunAt("HOURLY", anchor, now);
    }
    assert.equal(anchor, "2026-03-11T00:00:00.000Z");
  });

  it("uses UTC so the result does not depend on server region", () => {
    const due = "2026-06-15T23:30:00.000Z";
    const now = new Date("2026-06-15T23:31:00.000Z");
    assert.equal(nextRunAt("DAILY", due, now), "2026-06-16T23:30:00.000Z");
  });

  it("clamps month arithmetic instead of rolling over", () => {
    // Jan 31 + 1 month must be Feb 28, not Mar 2/3.
    const due = "2026-01-31T09:00:00.000Z";
    const now = new Date("2026-01-31T09:00:01.000Z");
    assert.equal(nextRunAt("MONTHLY", due, now), "2026-02-28T09:00:00.000Z");
  });

  it("clamps into a leap February", () => {
    const due = "2028-01-31T09:00:00.000Z";
    const now = new Date("2028-01-31T09:00:01.000Z");
    assert.equal(nextRunAt("MONTHLY", due, now), "2028-02-29T09:00:00.000Z");
  });

  it("skips a backlog rather than replaying every missed period", () => {
    // Worker was down for three days; the next run is the next future slot.
    const due = "2026-03-10T12:00:00.000Z";
    const now = new Date("2026-03-13T12:30:00.000Z");
    const next = new Date(nextRunAt("HOURLY", due, now));
    assert.ok(next.getTime() > now.getTime());
    // And only just in the future — not three days of catch-up.
    assert.ok(next.getTime() - now.getTime() <= 60 * 60 * 1000);
  });

  it("falls back to stepping from now when the anchor is missing or invalid", () => {
    const now = new Date("2026-03-10T12:00:00.000Z");
    assert.equal(nextRunAt("HOURLY", null, now), "2026-03-10T13:00:00.000Z");
    assert.equal(
      nextRunAt("HOURLY", "not-a-date", now),
      "2026-03-10T13:00:00.000Z"
    );
  });

  it("treats an unknown frequency as hourly", () => {
    const now = new Date("2026-03-10T12:00:00.000Z");
    assert.equal(nextRunAt("CUSTOM", null, now), "2026-03-10T13:00:00.000Z");
  });

  it("steps weekly by seven days", () => {
    const due = "2026-03-10T12:00:00.000Z";
    const now = new Date("2026-03-10T12:00:01.000Z");
    assert.equal(nextRunAt("WEEKLY", due, now), "2026-03-17T12:00:00.000Z");
  });
});

describe("retryRunAt", () => {
  const now = new Date("2026-03-10T12:00:00.000Z");

  it("backs off exponentially", () => {
    assert.equal(retryRunAt(1, now), "2026-03-10T12:15:00.000Z");
    assert.equal(retryRunAt(2, now), "2026-03-10T12:30:00.000Z");
    assert.equal(retryRunAt(3, now), "2026-03-10T13:00:00.000Z");
  });

  it("caps the backoff at six hours", () => {
    assert.equal(retryRunAt(7, now), "2026-03-10T18:00:00.000Z");
  });

  it("gives up once the failure budget is exhausted", () => {
    assert.equal(retryRunAt(MAX_CONSECUTIVE_FAILURES, now), null);
    assert.equal(retryRunAt(MAX_CONSECUTIVE_FAILURES + 5, now), null);
  });
});

describe("isFrequency", () => {
  it("accepts known frequencies and rejects others", () => {
    assert.equal(isFrequency("HOURLY"), true);
    assert.equal(isFrequency("MONTHLY"), true);
    assert.equal(isFrequency("CUSTOM"), false);
    assert.equal(isFrequency("hourly"), false);
  });
});

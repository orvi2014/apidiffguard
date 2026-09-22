import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BATCH_SIZE,
  checksPerTick,
  customersSupported,
  systemChecksPerHour,
  systemChecksPerMonth,
} from "@/lib/capacity";
import { PLANS } from "@/lib/plans";

const paid = PLANS.filter(
  (p) => p.id !== "free" && p.checkQuota !== null && p.endpointLimit !== null
);
const top = paid[paid.length - 1];

describe("runner capacity", () => {
  it("a tick is limited by the batch, not starved by the deadline", () => {
    // If the deadline were the binding constraint we would be paying for a
    // batch we never finish, and `deferred` would be permanently non-zero.
    assert.equal(
      checksPerTick(),
      BATCH_SIZE,
      `only ${checksPerTick()} of ${BATCH_SIZE} claimed checks fit in the deadline`
    );
  });

  it("can serve at least one customer on the largest tier", () => {
    // The failure this guards: selling a tier the platform cannot run even
    // once. Before parallelisation the runner did 300 checks/hour and the top
    // tier needed 300 — one customer consumed the entire system.
    assert.ok(
      systemChecksPerMonth() >= (top.checkQuota as number),
      `system does ${systemChecksPerMonth()}/mo but ${top.id} promises ${top.checkQuota}`
    );
  });

  it("documents how many customers of each tier fit", () => {
    // Not a threshold to pass — a number that must stay visible. If this drops
    // to 1 for a tier, the next sale needs infrastructure, not a discount.
    const counts = Object.fromEntries(
      paid.map((p) => [p.id, customersSupported(p.checkQuota as number)])
    );
    for (const p of paid) {
      assert.ok(
        counts[p.id] >= 1,
        `${p.id}: runner cannot carry even one customer at ${p.checkQuota}/mo`
      );
    }
    assert.ok(systemChecksPerHour() > 300, "no better than the serial runner");
  });
});

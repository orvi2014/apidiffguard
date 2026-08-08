import { strict as assert } from "node:assert";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";
import { SIGNATURE_TOLERANCE_SECONDS, verifyStripeSignature } from "./verify";
import { resolvePaidPlan } from "./billing";

const SECRET = "whsec_test_secret";

function sign(body: string, tsSeconds: number, secret = SECRET): string {
  const mac = createHmac("sha256", secret)
    .update(`${tsSeconds}.${body}`)
    .digest("hex");
  return `t=${tsSeconds},v1=${mac}`;
}

describe("verifyStripeSignature", () => {
  const body = JSON.stringify({ id: "evt_1", type: "checkout.session.completed" });
  const nowMs = 1_800_000_000_000;
  const nowSec = Math.floor(nowMs / 1000);
  const now = () => nowMs;

  it("accepts a correctly signed, fresh payload", async () => {
    const header = sign(body, nowSec);
    assert.equal(await verifyStripeSignature(body, header, SECRET, now), true);
  });

  it("rejects a payload signed with the wrong secret", async () => {
    const header = sign(body, nowSec, "whsec_attacker");
    assert.equal(await verifyStripeSignature(body, header, SECRET, now), false);
  });

  it("rejects a tampered body under a valid signature", async () => {
    const header = sign(body, nowSec);
    const tampered = JSON.stringify({ id: "evt_1", type: "invoice.paid" });
    assert.equal(
      await verifyStripeSignature(tampered, header, SECRET, now),
      false
    );
  });

  it("rejects a replayed payload outside the tolerance window", async () => {
    const stale = nowSec - (SIGNATURE_TOLERANCE_SECONDS + 1);
    assert.equal(
      await verifyStripeSignature(body, sign(body, stale), SECRET, now),
      false
    );
  });

  it("accepts a payload right at the edge of the tolerance window", async () => {
    const edge = nowSec - SIGNATURE_TOLERANCE_SECONDS;
    assert.equal(
      await verifyStripeSignature(body, sign(body, edge), SECRET, now),
      true
    );
  });

  it("rejects a timestamp too far in the future", async () => {
    const future = nowSec + SIGNATURE_TOLERANCE_SECONDS + 1;
    assert.equal(
      await verifyStripeSignature(body, sign(body, future), SECRET, now),
      false
    );
  });

  it("rejects malformed headers", async () => {
    for (const header of [
      "",
      "garbage",
      `t=${nowSec}`,
      "v1=deadbeef",
      `t=notanumber,v1=deadbeef`,
    ]) {
      assert.equal(
        await verifyStripeSignature(body, header, SECRET, now),
        false,
        `expected rejection for header: ${header}`
      );
    }
  });

  it("accepts when any one of several v1 signatures matches", async () => {
    const good = sign(body, nowSec).split(",")[1];
    const header = `t=${nowSec},v1=${"0".repeat(64)},${good}`;
    assert.equal(await verifyStripeSignature(body, header, SECRET, now), true);
  });
});

describe("resolvePaidPlan", () => {
  it("accepts Stripe lookup keys", () => {
    assert.equal(resolvePaidPlan("apidiffguard_starter_monthly"), "starter");
    assert.equal(resolvePaidPlan("apidiffguard_pro_monthly"), "pro");
  });

  it("also accepts app plan ids, so the two vocabularies cannot drift apart", () => {
    assert.equal(resolvePaidPlan("starter"), "starter");
    assert.equal(resolvePaidPlan("pro"), "pro");
  });

  it("rejects free, team, and unknown values", () => {
    assert.equal(resolvePaidPlan("free"), null);
    assert.equal(resolvePaidPlan("team"), null);
    assert.equal(resolvePaidPlan("enterprise"), null);
    assert.equal(resolvePaidPlan(null), null);
    assert.equal(resolvePaidPlan(undefined), null);
    assert.equal(resolvePaidPlan(""), null);
  });
});

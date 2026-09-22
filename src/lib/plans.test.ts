import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { PLANS, isPaidPlan, type PlanDefinition } from "@/lib/plans";

/** Hourly monitoring of one endpoint for a 30-day month. */
const CHECKS_PER_ENDPOINT_MONTHLY = 24 * 30;

const paid = PLANS.filter(
  (p): p is PlanDefinition & { endpointLimit: number; checkQuota: number } =>
    p.endpointLimit !== null && p.checkQuota !== null && p.id !== "free"
);

describe("plan quotas", () => {
  it("every paid tier can check its own endpoint limit hourly", () => {
    // The tier headline is "N endpoints". If the quota cannot sustain hourly
    // checks on N, the number is not true and the customer hits a wall the
    // pricing page never mentioned.
    for (const p of paid) {
      const needed = p.endpointLimit * CHECKS_PER_ENDPOINT_MONTHLY;
      assert.ok(
        p.checkQuota >= needed,
        `${p.id}: ${p.checkQuota} checks cannot cover ${p.endpointLimit} endpoints hourly (needs ${needed})`
      );
    }
  });

  it("endpoint limits and prices both increase with tier", () => {
    for (let i = 1; i < paid.length; i++) {
      assert.ok(
        paid[i].endpointLimit > paid[i - 1].endpointLimit,
        `${paid[i].id} must allow more endpoints than ${paid[i - 1].id}`
      );
      assert.ok(
        (paid[i].monthlyPrice ?? 0) > (paid[i - 1].monthlyPrice ?? 0),
        `${paid[i].id} must cost more than ${paid[i - 1].id}`
      );
    }
  });

  it("scale is a purchasable plan", () => {
    assert.equal(isPaidPlan("scale"), true);
    assert.equal(isPaidPlan("team"), false);
    assert.equal(isPaidPlan("free"), false);
  });
});

describe("plans.ts agrees with the database", () => {
  // plan_check_quota() in Postgres is what actually refuses a check. If it
  // disagrees with plans.ts the pricing page advertises a quota the database
  // will not honour.
  it("plan_check_quota matches every plan's checkQuota", () => {
    const dir = join(process.cwd(), "supabase", "migrations");
    const sql = readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort()
      .map((f) => readFileSync(join(dir, f), "utf8"))
      .filter((body) => body.includes("function public.plan_check_quota"))
      .pop();
    assert.ok(sql, "no migration defines plan_check_quota");

    for (const plan of PLANS) {
      if (plan.id === "free") continue;
      if (plan.checkQuota === null) {
        assert.match(
          sql,
          new RegExp(`when '${plan.id}' then null`, "i"),
          `${plan.id} is unlimited in plans.ts but not in SQL`
        );
        continue;
      }
      assert.match(
        sql,
        new RegExp(`when '${plan.id}' then ${plan.checkQuota}\\b`, "i"),
        `${plan.id}: SQL quota does not match plans.ts (${plan.checkQuota})`
      );
    }
  });
});

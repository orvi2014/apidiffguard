import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import {
  polarProductForPlan,
  resolvePolarPlan,
  resolvePolarPlanFromProduct,
  resolveWorkspaceId,
} from "@/lib/polar/billing";

const saved: Record<string, string | undefined> = {};
const KEYS = [
  "POLAR_PRODUCT_STARTER",
  "POLAR_PRODUCT_PRO",
  "POLAR_PRODUCT_STARTER_YEARLY",
  "POLAR_PRODUCT_PRO_YEARLY",
];

before(() => {
  for (const k of KEYS) saved[k] = process.env[k];
  process.env.POLAR_PRODUCT_STARTER = "prod_starter_123";
  process.env.POLAR_PRODUCT_PRO = "prod_pro_456";
  process.env.POLAR_PRODUCT_STARTER_YEARLY = "prod_starter_year_789";
  process.env.POLAR_PRODUCT_PRO_YEARLY = "prod_pro_year_012";
});

after(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("polarProductForPlan", () => {
  it("maps each paid plan to its configured product", () => {
    assert.equal(polarProductForPlan("starter"), "prod_starter_123");
    assert.equal(polarProductForPlan("pro"), "prod_pro_456");
  });

  it("returns null when the plan has no product configured", () => {
    delete process.env.POLAR_PRODUCT_PRO;
    try {
      assert.equal(polarProductForPlan("pro"), null);
    } finally {
      process.env.POLAR_PRODUCT_PRO = "prod_pro_456";
    }
  });
});

describe("resolvePolarPlanFromProduct", () => {
  it("reverses the mapping", () => {
    assert.equal(resolvePolarPlanFromProduct("prod_starter_123"), "starter");
    assert.equal(resolvePolarPlanFromProduct("prod_pro_456"), "pro");
  });

  it("refuses an unknown product rather than guessing", () => {
    // Guessing here would grant a paid plan for a product we never sold.
    assert.equal(resolvePolarPlanFromProduct("prod_someone_elses"), null);
    assert.equal(resolvePolarPlanFromProduct(null), null);
    assert.equal(resolvePolarPlanFromProduct(""), null);
  });
});

describe("resolvePolarPlan", () => {
  it("prefers the product id over metadata", () => {
    const plan = resolvePolarPlan({
      productId: "prod_pro_456",
      metadata: { plan: "starter" },
    });
    assert.equal(plan, "pro");
  });

  it("falls back to metadata when the product is unmapped", () => {
    // A product replaced in Polar leaves old subscriptions pointing at an id we
    // no longer know; the metadata we wrote at checkout still does.
    const plan = resolvePolarPlan({
      productId: "prod_retired_999",
      metadata: { plan: "starter" },
    });
    assert.equal(plan, "starter");
  });

  it("returns null when neither source identifies a paid plan", () => {
    assert.equal(resolvePolarPlan({ productId: null, metadata: null }), null);
    assert.equal(
      resolvePolarPlan({ productId: "x", metadata: { plan: "free" } }),
      null,
    );
    assert.equal(
      resolvePolarPlan({ productId: "x", metadata: { plan: "enterprise" } }),
      null,
    );
  });
});

describe("resolveWorkspaceId", () => {
  it("prefers the external customer id", () => {
    assert.equal(
      resolveWorkspaceId({
        externalCustomerId: "ws-1",
        metadata: { workspace_id: "ws-2" },
      }),
      "ws-1",
    );
  });

  it("falls back to checkout metadata", () => {
    assert.equal(
      resolveWorkspaceId({
        externalCustomerId: null,
        metadata: { workspace_id: "ws-2" },
      }),
      "ws-2",
    );
  });

  it("returns null when the event carries no binding at all", () => {
    // Better to log and drop than to apply a paid plan to a guessed workspace.
    assert.equal(resolveWorkspaceId({}), null);
    assert.equal(
      resolveWorkspaceId({ externalCustomerId: "  ", metadata: {} }),
      null,
    );
    assert.equal(
      resolveWorkspaceId({ metadata: { workspace_id: 42 } as never }),
      null,
    );
  });
});

describe("yearly billing", () => {
  it("maps each plan to its yearly product when asked for one", () => {
    assert.equal(
      polarProductForPlan("starter", "year"),
      "prod_starter_year_789"
    );
    assert.equal(polarProductForPlan("pro", "year"), "prod_pro_year_012");
  });

  it("defaults to monthly when no interval is given", () => {
    assert.equal(polarProductForPlan("starter"), "prod_starter_123");
    assert.equal(polarProductForPlan("starter", "month"), "prod_starter_123");
  });

  // The reverse lookup is the path that decides whether a paying customer gets
  // access. An unrecognised yearly id makes the webhook grant nothing, so a
  // successful charge would leave the customer on the free plan.
  it("recognises yearly product ids in the reverse lookup", () => {
    assert.equal(
      resolvePolarPlanFromProduct("prod_starter_year_789"),
      "starter"
    );
    assert.equal(resolvePolarPlanFromProduct("prod_pro_year_012"), "pro");
  });

  it("still rejects ids belonging to no plan", () => {
    assert.equal(resolvePolarPlanFromProduct("prod_someone_elses"), null);
  });

  it("returns null when the yearly product is not configured", () => {
    delete process.env.POLAR_PRODUCT_PRO_YEARLY;
    try {
      assert.equal(polarProductForPlan("pro", "year"), null);
      // and the monthly id must not be mistaken for the yearly one
      assert.notEqual(polarProductForPlan("pro", "year"), "prod_pro_456");
    } finally {
      process.env.POLAR_PRODUCT_PRO_YEARLY = "prod_pro_year_012";
    }
  });
});

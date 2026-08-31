import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  authConfigFromJson,
  authConfigValid,
  isScheduleFrequency,
  normalizeAuthType,
  normalizeDiffMode,
  normalizeMethod,
} from "./endpoint-input";

describe("normalizeMethod", () => {
  it("upper-cases a known method", () => {
    assert.equal(normalizeMethod("post"), "POST");
    assert.equal(normalizeMethod(" patch "), "PATCH");
  });

  it("falls back to GET rather than writing an invalid enum", () => {
    assert.equal(normalizeMethod("TRACE"), "GET");
    assert.equal(normalizeMethod(undefined), "GET");
    assert.equal(normalizeMethod(42), "GET");
  });
});

describe("normalizeAuthType", () => {
  it("accepts hyphen, underscore and case variants of the same type", () => {
    for (const input of ["api-key", "API_KEY", "Api-Key", " api_key "]) {
      assert.equal(normalizeAuthType(input), "API_KEY");
    }
  });

  it("falls back to NONE for anything unrecognised", () => {
    assert.equal(normalizeAuthType("mtls"), "NONE");
    assert.equal(normalizeAuthType(null), "NONE");
  });
});

describe("normalizeDiffMode", () => {
  it("keeps a known mode and defaults the rest to schema", () => {
    assert.equal(normalizeDiffMode("exact"), "exact");
    assert.equal(normalizeDiffMode("EXACT"), "exact");
    assert.equal(normalizeDiffMode("fuzzy"), "schema");
    assert.equal(normalizeDiffMode(undefined), "schema");
  });
});

describe("authConfigFromJson", () => {
  it("reads only the fields the chosen type uses", () => {
    const config = authConfigFromJson("BEARER", {
      token: "t",
      key: "leaked",
      password: "leaked",
    });
    assert.deepEqual(config, { token: "t" });
  });

  it("defaults the API key header but keeps an explicit one", () => {
    assert.equal(authConfigFromJson("API_KEY", { key: "k" }).header, "X-API-Key");
    assert.equal(
      authConfigFromJson("API_KEY", { key: "k", header: "x-api-key" }).header,
      "x-api-key"
    );
  });

  it("returns nothing for NONE even when credentials are supplied", () => {
    assert.deepEqual(authConfigFromJson("NONE", { token: "t" }), {});
  });

  it("tolerates a missing or non-object auth block", () => {
    assert.deepEqual(authConfigFromJson("BEARER", undefined), { token: "" });
    assert.deepEqual(authConfigFromJson("BEARER", "nope"), { token: "" });
  });
});

describe("authConfigValid", () => {
  it("requires the credential each type actually sends", () => {
    assert.equal(authConfigValid("BEARER", { token: "t" }), true);
    assert.equal(authConfigValid("BEARER", { token: "" }), false);
    assert.equal(authConfigValid("API_KEY", { key: "k" }), true);
    assert.equal(authConfigValid("API_KEY", { header: "h" }), false);
    assert.equal(authConfigValid("BASIC", { username: "u" }), true);
    assert.equal(authConfigValid("BASIC", { password: "p" }), false);
    assert.equal(authConfigValid("CUSTOM", { header: "h", value: "v" }), true);
    assert.equal(authConfigValid("CUSTOM", { header: "h" }), false);
  });

  it("accepts NONE with an empty config", () => {
    assert.equal(authConfigValid("NONE", {}), true);
  });
});

describe("isScheduleFrequency", () => {
  it("accepts the database enum values and rejects the rest", () => {
    assert.equal(isScheduleFrequency("DAILY"), true);
    assert.equal(isScheduleFrequency("HOURLY"), true);
    // CUSTOM exists in the enum but needs a cron expression this route does
    // not accept, so it must not be schedulable through the API.
    assert.equal(isScheduleFrequency("CUSTOM"), false);
    assert.equal(isScheduleFrequency("daily"), false);
  });
});

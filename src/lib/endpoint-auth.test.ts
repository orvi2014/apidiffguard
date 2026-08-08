import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  authHeadersFromEndpoint,
  buildStoredHeaders,
  requestBodyFromEndpoint,
  severityMeetsMinimum,
} from "./endpoint-auth";

describe("severityMeetsMinimum", () => {
  it("passes at or above the threshold", () => {
    assert.equal(severityMeetsMinimum("BREAKING", "WARNING"), true);
    assert.equal(severityMeetsMinimum("WARNING", "WARNING"), true);
    assert.equal(severityMeetsMinimum("INFO", "INFO"), true);
  });

  it("filters out anything below the threshold", () => {
    assert.equal(severityMeetsMinimum("INFO", "WARNING"), false);
    assert.equal(severityMeetsMinimum("WARNING", "BREAKING"), false);
  });

  it("accepts a lowercase threshold from the database", () => {
    assert.equal(severityMeetsMinimum("BREAKING", "warning"), true);
  });

  it("throws on an unknown threshold instead of silently defaulting", () => {
    // Defaulting to WARNING would drop BREAKING alerts on a typo'd row.
    assert.throws(
      () => severityMeetsMinimum("BREAKING", "CRITICAL"),
      /Unknown alert severity threshold/
    );
  });
});

describe("authHeadersFromEndpoint", () => {
  it("builds a bearer header", () => {
    const headers = authHeadersFromEndpoint(
      { auth_type: "BEARER" },
      { token: "t0ken" }
    );
    assert.equal(headers.Authorization, "Bearer t0ken");
  });

  it("builds basic auth from username and password", () => {
    const headers = authHeadersFromEndpoint(
      { auth_type: "BASIC" },
      { username: "alice", password: "s3cret" }
    );
    assert.equal(
      headers.Authorization,
      `Basic ${Buffer.from("alice:s3cret").toString("base64")}`
    );
  });

  it("defaults the API-key header name", () => {
    const headers = authHeadersFromEndpoint(
      { auth_type: "API_KEY" },
      { key: "abc" }
    );
    assert.equal(headers["X-API-Key"], "abc");
  });

  it("emits nothing when credentials are missing", () => {
    assert.deepEqual(
      authHeadersFromEndpoint({ auth_type: "BEARER" }, {}),
      {}
    );
    assert.deepEqual(authHeadersFromEndpoint({ auth_type: "NONE" }), {});
  });

  it("never leaks internal __adg_ keys as outbound headers", () => {
    const headers = authHeadersFromEndpoint({
      auth_type: "NONE",
      headers: { "X-Real": "yes", __adg_body: '{"a":1}' },
    });
    assert.equal(headers["X-Real"], "yes");
    assert.equal("__adg_body" in headers, false);
  });
});

describe("requestBodyFromEndpoint", () => {
  it("round-trips a stored request body", () => {
    const stored = buildStoredHeaders({
      contentType: "application/json",
      requestBody: '{"a":1}',
    });
    assert.equal(stored["Content-Type"], "application/json");
    assert.equal(requestBodyFromEndpoint({ headers: stored }), '{"a":1}');
  });

  it("returns undefined when no body was stored", () => {
    assert.equal(requestBodyFromEndpoint({ headers: {} }), undefined);
    assert.equal(requestBodyFromEndpoint({}), undefined);
  });
});

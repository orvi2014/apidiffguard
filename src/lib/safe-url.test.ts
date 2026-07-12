import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isBlockedHost,
  parseAndAssertPublicUrl,
  safeNextPath,
} from "./safe-url";

describe("safeNextPath", () => {
  it("allows relative app paths", () => {
    assert.equal(safeNextPath("/dashboard"), "/dashboard");
    assert.equal(safeNextPath("/endpoints/abc"), "/endpoints/abc");
  });

  it("rejects open redirects", () => {
    assert.equal(safeNextPath("//evil.com"), "/dashboard");
    assert.equal(safeNextPath("https://evil.com"), "/dashboard");
    assert.equal(safeNextPath("/\\evil.com"), "/dashboard");
    assert.equal(safeNextPath("dashboard"), "/dashboard");
  });
});

describe("isBlockedHost", () => {
  it("blocks loopback and private ranges", () => {
    assert.equal(isBlockedHost("localhost"), true);
    assert.equal(isBlockedHost("localhost."), true);
    assert.equal(isBlockedHost("127.0.0.1"), true);
    assert.equal(isBlockedHost("10.0.0.5"), true);
    assert.equal(isBlockedHost("192.168.1.1"), true);
    assert.equal(isBlockedHost("172.16.0.1"), true);
    assert.equal(isBlockedHost("169.254.169.254"), true);
    assert.equal(isBlockedHost("::1"), true);
    assert.equal(isBlockedHost("[::1]"), true);
    assert.equal(isBlockedHost("fd12::1"), true);
    assert.equal(isBlockedHost("::ffff:127.0.0.1"), true);
  });

  it("allows public hosts", () => {
    assert.equal(isBlockedHost("api.github.com"), false);
    assert.equal(isBlockedHost("example.com"), false);
  });
});

describe("parseAndAssertPublicUrl", () => {
  it("accepts https public URLs", () => {
    const url = parseAndAssertPublicUrl("https://example.com/openapi.json");
    assert.equal(url.hostname, "example.com");
  });

  it("rejects credentials and private hosts", () => {
    assert.throws(() => parseAndAssertPublicUrl("http://127.0.0.1/secret"));
    assert.throws(() =>
      parseAndAssertPublicUrl("https://user:pass@example.com/x")
    );
    assert.throws(() => parseAndAssertPublicUrl("ftp://example.com/x"));
  });
});

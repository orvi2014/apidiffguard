import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CREDENTIAL_HEADERS,
  isBlockedHost,
  parseAndAssertPublicUrl,
  safeNextPath,
  sameOrigin,
  sanitizeOutboundHeaders,
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

describe("parseAndAssertPublicUrl — requireHttps", () => {
  it("rejects plain http when https is required", () => {
    // Alert delivery uses this: payloads must never go out in the clear, even
    // for rows written by an import or directly into the database.
    assert.throws(
      () =>
        parseAndAssertPublicUrl("http://example.com/hook", {
          requireHttps: true,
        }),
      /Only https/
    );
  });

  it("still accepts https when https is required", () => {
    const url = parseAndAssertPublicUrl("https://example.com/hook", {
      requireHttps: true,
    });
    assert.equal(url.protocol, "https:");
  });

  it("still blocks private hosts even over https", () => {
    assert.throws(() =>
      parseAndAssertPublicUrl("https://169.254.169.254/latest/meta-data", {
        requireHttps: true,
      })
    );
  });
});

describe("sanitizeOutboundHeaders", () => {
  it("lets Authorization through to the host the user named", () => {
    // Regression: this header used to be in the blocklist, so every BEARER,
    // OAUTH and BASIC endpoint was silently checked unauthenticated.
    const h = sanitizeOutboundHeaders({ Authorization: "Bearer tok" });
    assert.equal(h.get("authorization"), "Bearer tok");
  });

  it("still drops hop-by-hop and spoofable headers", () => {
    const h = sanitizeOutboundHeaders({
      Host: "evil.example",
      Connection: "keep-alive",
      "Content-Length": "0",
      Cookie: "session=1",
      "Proxy-Authorization": "Basic x",
      "Proxy-Anything": "x",
      "X-Forwarded-For": "1.2.3.4",
      "X-Real-Header": "kept",
    });
    for (const blocked of [
      "host",
      "connection",
      "content-length",
      "cookie",
      "proxy-authorization",
      "proxy-anything",
      "x-forwarded-for",
    ]) {
      assert.equal(h.get(blocked), null, `${blocked} should be dropped`);
    }
    assert.equal(h.get("x-real-header"), "kept");
  });
});

describe("sameOrigin", () => {
  const at = (u: string) => new URL(u);

  it("matches on scheme, host and port together", () => {
    assert.equal(sameOrigin(at("https://a.com/x"), at("https://a.com/y")), true);
    assert.equal(sameOrigin(at("https://a.com"), at("https://b.com")), false);
    // A downgrade to http is a different origin: credentials must not ride it.
    assert.equal(sameOrigin(at("https://a.com"), at("http://a.com")), false);
    // So is a different port on the same host.
    assert.equal(sameOrigin(at("https://a.com"), at("https://a.com:8443")), false);
    // And a sibling subdomain, which is a common redirect-leak shape.
    assert.equal(sameOrigin(at("https://a.com"), at("https://evil.a.com")), false);
  });

  it("names every header that must not cross that boundary", () => {
    assert.deepEqual(CREDENTIAL_HEADERS, ["authorization", "cookie", "cookie2"]);
  });
});

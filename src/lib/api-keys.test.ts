import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { API_KEY_PREFIX, generateApiKey, hashApiKey, hasScope } from "./api-keys";
import { DEFAULT_SCOPES, isApiScope, parseScopes } from "./api-scopes";

describe("generateApiKey", () => {
  it("issues a prefixed token whose stored hash is not the token", () => {
    const { token, prefix, hash } = generateApiKey();
    assert.ok(token.startsWith(API_KEY_PREFIX));
    assert.equal(prefix, token.slice(0, 16));
    assert.notEqual(hash, token);
    // sha256 hex
    assert.match(hash, /^[0-9a-f]{64}$/);
    assert.equal(hash, hashApiKey(token));
  });

  it("does not repeat tokens", () => {
    const tokens = new Set(
      Array.from({ length: 200 }, () => generateApiKey().token)
    );
    assert.equal(tokens.size, 200);
  });

  it("stores a prefix that cannot be used to reconstruct the secret", () => {
    const { token, prefix } = generateApiKey();
    assert.ok(prefix.length < token.length);
    assert.equal(hashApiKey(prefix) === hashApiKey(token), false);
  });
});

describe("hashApiKey", () => {
  it("is stable and distinguishes different tokens", () => {
    assert.equal(hashApiKey("adg_live_abc"), hashApiKey("adg_live_abc"));
    assert.notEqual(hashApiKey("adg_live_abc"), hashApiKey("adg_live_abd"));
  });
});

describe("parseScopes", () => {
  it("falls back to the least-privilege default", () => {
    assert.deepEqual(parseScopes(undefined), DEFAULT_SCOPES);
    assert.deepEqual(parseScopes(null), DEFAULT_SCOPES);
    assert.deepEqual(parseScopes([]), DEFAULT_SCOPES);
    assert.deepEqual(parseScopes("checks:run"), DEFAULT_SCOPES);
  });

  it("drops unknown scopes rather than trusting stored data", () => {
    assert.deepEqual(parseScopes(["checks:run", "admin:everything"]), [
      "checks:run",
    ]);
  });

  it("keeps recognised scopes", () => {
    assert.deepEqual(parseScopes(["endpoints:read", "baselines:write"]), [
      "endpoints:read",
      "baselines:write",
    ]);
  });

  it("returns the default when every entry is invalid", () => {
    assert.deepEqual(parseScopes(["nope", 42, null]), DEFAULT_SCOPES);
  });
});

describe("hasScope", () => {
  const auth = {
    keyId: "k",
    userId: "u",
    workspaceId: "w",
    scopes: parseScopes(["endpoints:read"]),
  };

  it("grants only what was issued", () => {
    assert.equal(hasScope(auth, "endpoints:read"), true);
    assert.equal(hasScope(auth, "checks:run"), false);
    assert.equal(hasScope(auth, "baselines:write"), false);
  });
});

describe("isApiScope", () => {
  it("recognises known scopes only", () => {
    assert.equal(isApiScope("checks:run"), true);
    assert.equal(isApiScope("checks:RUN"), false);
    assert.equal(isApiScope(""), false);
  });
});

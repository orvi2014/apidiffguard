import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { appUrl } from "./app-url";

const KEYS = [
  "NEXT_PUBLIC_APP_URL",
  "VERCEL_URL",
  "VERCEL_PROJECT_PRODUCTION_URL",
] as const;
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));

function setEnv(values: Partial<Record<(typeof KEYS)[number], string>>) {
  for (const k of KEYS) delete process.env[k];
  for (const [k, v] of Object.entries(values)) process.env[k] = v;
}

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("appUrl", () => {
  it("prefers an explicit NEXT_PUBLIC_APP_URL over the Vercel host", () => {
    // Production sets the custom domain; VERCEL_URL there is the deployment's
    // own *.vercel.app address, which is not where users are.
    setEnv({
      NEXT_PUBLIC_APP_URL: "https://apidiffguard.com",
      VERCEL_URL: "dpl-abc123.vercel.app",
    });
    assert.equal(appUrl(), "https://apidiffguard.com");
  });

  it("trims a trailing slash so callers can concatenate a path", () => {
    setEnv({ NEXT_PUBLIC_APP_URL: "https://apidiffguard.com/" });
    assert.equal(appUrl(), "https://apidiffguard.com");
  });

  it("falls back to the Vercel host when no explicit URL is set", () => {
    // This is the preview case: the variable is deliberately unset because the
    // URL differs per deployment. It used to yield localhost, which sent OAuth
    // callbacks and invite links to the developer's machine.
    setEnv({ VERCEL_URL: "apidiffguard-abc123.vercel.app" });
    assert.equal(appUrl(), "https://apidiffguard-abc123.vercel.app");
  });

  it("uses localhost only when nothing else identifies the host", () => {
    setEnv({});
    assert.equal(appUrl(), "http://localhost:3000");
  });

  it("treats an empty variable as unset rather than as an origin", () => {
    setEnv({ NEXT_PUBLIC_APP_URL: "", VERCEL_URL: "preview.vercel.app" });
    assert.equal(appUrl(), "https://preview.vercel.app");
  });
});

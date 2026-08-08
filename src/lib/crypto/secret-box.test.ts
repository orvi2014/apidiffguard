import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, before, describe, it } from "node:test";
import {
  isSealedEnvelope,
  MissingSecretKeyError,
  openSecrets,
  sealSecrets,
  secretsEqual,
} from "@/lib/crypto/secret-box";

const KEY = randomBytes(32).toString("base64");
const OTHER_KEY = randomBytes(32).toString("base64");
let original: string | undefined;

before(() => {
  original = process.env.ENDPOINT_SECRET_KEY;
  process.env.ENDPOINT_SECRET_KEY = KEY;
});

after(() => {
  if (original === undefined) delete process.env.ENDPOINT_SECRET_KEY;
  else process.env.ENDPOINT_SECRET_KEY = original;
});

describe("sealSecrets / openSecrets", () => {
  it("round-trips a credential map", () => {
    const sealed = sealSecrets({ token: "t0ken", header: "X-Key" }, "endpoint-1");
    assert.deepEqual(openSecrets(sealed, "endpoint-1"), {
      token: "t0ken",
      header: "X-Key",
    });
  });

  it("does not store the plaintext anywhere in the envelope", () => {
    const sealed = sealSecrets({ token: "supersecret" }, "endpoint-1");
    assert.ok(!JSON.stringify(sealed).includes("supersecret"));
    assert.ok(isSealedEnvelope(sealed));
  });

  it("produces a different ciphertext each time", () => {
    const a = sealSecrets({ token: "same" }, "endpoint-1");
    const b = sealSecrets({ token: "same" }, "endpoint-1");
    assert.notEqual(a.ct, b.ct);
    assert.notEqual(a.iv, b.iv);
  });

  it("refuses a ciphertext moved to a different endpoint", () => {
    // The whole point of binding the endpoint id as AAD: an attacker who can
    // write rows must not be able to copy a credential onto an endpoint whose
    // URL they control and have the checker post it to them.
    const sealed = sealSecrets({ token: "t0ken" }, "endpoint-1");
    assert.throws(
      () => openSecrets(sealed, "endpoint-2"),
      /could not be decrypted/,
    );
  });

  it("refuses a tampered ciphertext", () => {
    const sealed = sealSecrets({ token: "t0ken" }, "endpoint-1");
    const flipped = Buffer.from(sealed.ct, "base64");
    flipped[0] ^= 0xff;
    assert.throws(
      () => openSecrets({ ...sealed, ct: flipped.toString("base64") }, "endpoint-1"),
      /could not be decrypted/,
    );
  });

  it("refuses a ciphertext sealed under a different key", () => {
    const sealed = sealSecrets({ token: "t0ken" }, "endpoint-1");
    process.env.ENDPOINT_SECRET_KEY = OTHER_KEY;
    try {
      assert.throws(
        () => openSecrets(sealed, "endpoint-1"),
        /could not be decrypted/,
      );
    } finally {
      process.env.ENDPOINT_SECRET_KEY = KEY;
    }
  });

  it("reads pre-encryption plaintext rows unchanged", () => {
    // Rows written before this shipped are bare JSON. They must keep working
    // until the endpoint is next saved, or every legacy check breaks at once.
    assert.deepEqual(openSecrets({ token: "legacy" }, "endpoint-1"), {
      token: "legacy",
    });
  });

  it("treats null and non-objects as empty", () => {
    assert.deepEqual(openSecrets(null, "endpoint-1"), {});
    assert.deepEqual(openSecrets("nope", "endpoint-1"), {});
  });

  it("throws a typed error when no key is configured", () => {
    delete process.env.ENDPOINT_SECRET_KEY;
    try {
      assert.throws(
        () => sealSecrets({ token: "t0ken" }, "endpoint-1"),
        MissingSecretKeyError,
      );
    } finally {
      process.env.ENDPOINT_SECRET_KEY = KEY;
    }
  });

  it("rejects a key that is not 32 bytes", () => {
    process.env.ENDPOINT_SECRET_KEY = Buffer.from("short").toString("base64");
    try {
      assert.throws(
        () => sealSecrets({ token: "t0ken" }, "endpoint-1"),
        /must decode to 32 bytes/,
      );
    } finally {
      process.env.ENDPOINT_SECRET_KEY = KEY;
    }
  });

  it("accepts a hex-encoded key", () => {
    const hex = randomBytes(32).toString("hex");
    process.env.ENDPOINT_SECRET_KEY = hex;
    try {
      const sealed = sealSecrets({ token: "t0ken" }, "endpoint-1");
      assert.deepEqual(openSecrets(sealed, "endpoint-1"), { token: "t0ken" });
    } finally {
      process.env.ENDPOINT_SECRET_KEY = KEY;
    }
  });
});

describe("secretsEqual", () => {
  it("matches identical strings and rejects others", () => {
    assert.equal(secretsEqual("abc", "abc"), true);
    assert.equal(secretsEqual("abc", "abd"), false);
    assert.equal(secretsEqual("abc", "abcd"), false);
  });
});

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

/**
 * Authenticated encryption for endpoint credentials at rest.
 *
 * Endpoint `auth_config` holds bearer tokens, API keys, and basic-auth
 * passwords for our customers' production APIs. Stored as plaintext JSON, any
 * read of the row — a leaked backup, an over-broad RLS policy, a support query,
 * a compromised service key — hands over live credentials to third-party
 * systems. Encrypting them means the database alone is not enough.
 *
 * AES-256-GCM with a random 96-bit IV per seal. The endpoint id is bound in as
 * additional authenticated data, so a ciphertext lifted from one endpoint row
 * cannot be pasted into another one whose target URL the attacker controls.
 *
 * The key lives in `ENDPOINT_SECRET_KEY`, outside the database, so possession
 * of the data is not possession of the secrets.
 */

const ENVELOPE_VERSION = 1;
const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const KEY_BYTES = 32;

export type SealedEnvelope = {
  __enc: typeof ENVELOPE_VERSION;
  alg: "A256GCM";
  iv: string;
  ct: string;
  tag: string;
};

export class MissingSecretKeyError extends Error {
  constructor() {
    super(
      "ENDPOINT_SECRET_KEY is not configured, so endpoint credentials cannot be encrypted. " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\""
    );
    this.name = "MissingSecretKeyError";
  }
}

function decodeKey(raw: string): Buffer {
  const trimmed = raw.trim();
  // Accept hex or base64 so operators can paste whatever their secret manager
  // hands them, but insist on a real 256-bit key either way.
  const buf = /^[0-9a-fA-F]{64}$/.test(trimmed)
    ? Buffer.from(trimmed, "hex")
    : Buffer.from(trimmed, "base64");
  if (buf.length !== KEY_BYTES) {
    throw new Error(
      `ENDPOINT_SECRET_KEY must decode to ${KEY_BYTES} bytes (got ${buf.length}).`
    );
  }
  return buf;
}

let cachedKey: Buffer | null = null;
let cachedFrom: string | null = null;

function secretKey(): Buffer {
  const raw = process.env.ENDPOINT_SECRET_KEY;
  if (!raw) throw new MissingSecretKeyError();
  if (cachedKey && cachedFrom === raw) return cachedKey;
  cachedKey = decodeKey(raw);
  cachedFrom = raw;
  return cachedKey;
}

export function hasSecretKey(): boolean {
  try {
    secretKey();
    return true;
  } catch {
    return false;
  }
}

export function isSealedEnvelope(value: unknown): value is SealedEnvelope {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    v.__enc === ENVELOPE_VERSION &&
    typeof v.iv === "string" &&
    typeof v.ct === "string" &&
    typeof v.tag === "string"
  );
}

/** Encrypt a flat credential map. `aad` binds the ciphertext to one endpoint. */
export function sealSecrets(
  plain: Record<string, string>,
  aad: string
): SealedEnvelope {
  const key = secretKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  cipher.setAAD(Buffer.from(aad, "utf8"));
  const ct = Buffer.concat([
    cipher.update(JSON.stringify(plain), "utf8"),
    cipher.final(),
  ]);
  return {
    __enc: ENVELOPE_VERSION,
    alg: "A256GCM",
    iv: iv.toString("base64"),
    ct: ct.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  };
}

/**
 * Decrypt a credential map.
 *
 * Rows written before encryption was introduced are plain JSON objects; they
 * are returned as-is so existing endpoints keep working, and are re-sealed the
 * next time the endpoint is saved.
 */
export function openSecrets(
  value: unknown,
  aad: string
): Record<string, string> {
  if (!value || typeof value !== "object") return {};

  if (!isSealedEnvelope(value)) {
    const legacy: Record<string, string> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (typeof v === "string") legacy[k] = v;
    }
    return legacy;
  }

  const key = secretKey();
  const iv = Buffer.from(value.iv, "base64");
  const tag = Buffer.from(value.tag, "base64");
  if (iv.length !== IV_BYTES) {
    throw new Error("Stored credentials have a malformed IV.");
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAAD(Buffer.from(aad, "utf8"));
  decipher.setAuthTag(tag);

  let json: string;
  try {
    json = Buffer.concat([
      decipher.update(Buffer.from(value.ct, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    // GCM tag mismatch: wrong key, wrong endpoint, or tampered row. Never fall
    // back to treating the ciphertext as usable.
    throw new Error(
      "Stored credentials could not be decrypted. The encryption key may have changed."
    );
  }

  const parsed: unknown = JSON.parse(json);
  if (!parsed || typeof parsed !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

/** Constant-time equality for comparing user-supplied secrets. */
export function secretsEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

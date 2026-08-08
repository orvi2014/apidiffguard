/**
 * Stripe webhook signature verification.
 *
 * Extracted from the route so it can be tested directly — this is the only
 * thing standing between the public internet and workspace plan changes.
 */
export const SIGNATURE_TOLERANCE_SECONDS = 300;

export async function verifyStripeSignature(
  body: string,
  signatureHeader: string,
  secret: string,
  now: () => number = Date.now
): Promise<boolean> {
  const parts = signatureHeader.split(",");
  const tPart = parts.find((p) => p.startsWith("t="));
  const v1Parts = parts.filter((p) => p.startsWith("v1="));
  if (!tPart || v1Parts.length === 0) return false;

  const timestamp = tPart.slice(2);
  const tsSeconds = Number.parseInt(timestamp, 10);
  if (
    Number.isNaN(tsSeconds) ||
    Math.abs(now() / 1000 - tsSeconds) > SIGNATURE_TOLERANCE_SECONDS
  ) {
    return false;
  }

  const payload = `${timestamp}.${body}`;
  const keyData = new TextEncoder().encode(secret);
  const msgData = new TextEncoder().encode(payload);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
  const expected =
    "v1=" +
    Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

  return v1Parts.some((v1) => {
    if (v1.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < v1.length; i++) {
      diff |= v1.charCodeAt(i) ^ expected.charCodeAt(i);
    }
    return diff === 0;
  });
}

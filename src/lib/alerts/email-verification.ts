import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { renderVerificationEmail, sendEmail } from "@/lib/alerts/email";
import { createServiceClient } from "@/lib/supabase/server";
import { appUrl } from "@/lib/app-url";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Issue a confirmation link for an email alert destination.
 *
 * Re-issuing replaces any outstanding token, so a resend invalidates the
 * previous link rather than leaving several live at once.
 */
export async function startEmailVerification(opts: {
  alertConfigId: string;
  email: string;
  workspaceName: string;
}): Promise<{ ok: boolean; error?: string }> {
  const token = randomBytes(32).toString("base64url");
  const service = createServiceClient();

  const { error } = await service.from("alert_channel_verifications").upsert(
    {
      alert_config_id: opts.alertConfigId,
      email: opts.email,
      token_hash: hashToken(token),
      sent_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
      verified_at: null,
    },
    { onConflict: "alert_config_id" }
  );

  if (error) return { ok: false, error: error.message };

  const verifyUrl = `${appUrl()}/api/alerts/verify?c=${encodeURIComponent(
    opts.alertConfigId
  )}&t=${encodeURIComponent(token)}`;

  const rendered = renderVerificationEmail({
    workspaceName: opts.workspaceName,
    verifyUrl,
  });

  const sent = await sendEmail({ to: opts.email, ...rendered });
  if (!sent.ok) return { ok: false, error: sent.error };
  return { ok: true };
}

export type VerificationOutcome =
  | { status: "verified" }
  | { status: "already-verified" }
  | { status: "expired" }
  | { status: "invalid" };

/**
 * Redeem a confirmation token.
 *
 * The token is the only authorisation here — the recipient is generally not
 * signed in when they click — so it is compared in constant time against the
 * stored hash and consumed on success.
 */
export async function completeEmailVerification(
  alertConfigId: string,
  token: string,
  client?: SupabaseClient
): Promise<VerificationOutcome> {
  const service = client ?? createServiceClient();

  const { data: row } = await service
    .from("alert_channel_verifications")
    .select("alert_config_id, token_hash, expires_at, verified_at")
    .eq("alert_config_id", alertConfigId)
    .maybeSingle();

  if (!row) return { status: "invalid" };
  if (row.verified_at) return { status: "already-verified" };

  const expected = Buffer.from(String(row.token_hash), "utf8");
  const actual = Buffer.from(hashToken(token), "utf8");
  if (
    expected.length !== actual.length ||
    !timingSafeEqual(expected, actual)
  ) {
    return { status: "invalid" };
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { status: "expired" };
  }

  const now = new Date().toISOString();
  await service
    .from("alert_channel_verifications")
    .update({ verified_at: now })
    .eq("alert_config_id", alertConfigId);
  await service
    .from("alert_configs")
    .update({ verified_at: now })
    .eq("id", alertConfigId);

  return { status: "verified" };
}

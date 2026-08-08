import { safeFetch } from "@/lib/safe-fetch";

/**
 * Transactional email via Resend.
 *
 * Called directly over the REST API rather than through the SDK: one POST with
 * a bearer token is the whole surface we need, and it keeps the dependency
 * footprint (and the supply-chain exposure of a package that handles our
 * sending credentials) at zero.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type EmailResult =
  | { ok: true; id: string | null }
  | { ok: false; error: string };

/** Both halves are required — a key with no From address cannot send. */
export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.ALERT_FROM_EMAIL);
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  // Length cap keeps a pathological address out of the database and out of the
  // SMTP conversation; 254 is the RFC 5321 maximum.
  return trimmed.length <= 254 && EMAIL_PATTERN.test(trimmed);
}

export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ALERT_FROM_EMAIL;
  if (!apiKey || !from) {
    return {
      ok: false,
      error:
        "Email delivery is not configured on this server (RESEND_API_KEY and ALERT_FROM_EMAIL).",
    };
  }
  if (!isValidEmail(message.to)) {
    return { ok: false, error: "Invalid destination address." };
  }

  try {
    const response = await safeFetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
      timeoutMs: 12_000,
    });

    if (!response.ok) {
      // Resend puts a human-readable reason in the body; surface it so a bad
      // domain or a revoked key is diagnosable from alert history.
      let detail = `HTTP ${response.status}`;
      try {
        const body = (await response.json()) as { message?: string };
        if (body?.message) detail = `${detail}: ${body.message}`;
      } catch {
        // Non-JSON error body — the status alone will have to do.
      }
      return { ok: false, error: detail };
    }

    const body = (await response.json().catch(() => null)) as {
      id?: string;
    } | null;
    return { ok: true, id: body?.id ?? null };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Email delivery failed.",
    };
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const SHELL_STYLE =
  "font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;" +
  "background:#0b0d10;color:#e6e8eb;padding:32px;border-radius:12px;max-width:520px;margin:0 auto";

/** Alert notification body. */
export function renderAlertEmail(opts: {
  severity: string;
  message: string;
  endpointName?: string;
  diffUrl?: string | null;
}): { subject: string; html: string; text: string } {
  const severity = opts.severity.toUpperCase();
  const subject =
    severity === "BREAKING"
      ? `Breaking API change: ${opts.endpointName ?? "endpoint"}`
      : `API drift detected: ${opts.endpointName ?? "endpoint"}`;

  const accent = severity === "BREAKING" ? "#ff6b6b" : "#ffb454";
  const link = opts.diffUrl
    ? `<p style="margin:24px 0 0"><a href="${escapeHtml(opts.diffUrl)}" style="background:#4F7FFF;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block">View the diff</a></p>`
    : "";

  const html = `<div style="${SHELL_STYLE}">
  <p style="margin:0 0 4px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:${accent}">${escapeHtml(severity)}</p>
  <h1 style="margin:0 0 16px;font-size:18px;font-weight:600">APIDiffGuard</h1>
  <p style="margin:0;line-height:1.6;color:#b6bcc4">${escapeHtml(opts.message)}</p>
  ${link}
</div>`;

  const text = `${severity}\n\n${opts.message}${
    opts.diffUrl ? `\n\nView the diff: ${opts.diffUrl}` : ""
  }`;

  return { subject, html, text };
}

/** Destination-confirmation body. */
export function renderVerificationEmail(opts: {
  workspaceName: string;
  verifyUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = "Confirm alerts from APIDiffGuard";
  const html = `<div style="${SHELL_STYLE}">
  <h1 style="margin:0 0 16px;font-size:18px;font-weight:600">Confirm this address</h1>
  <p style="margin:0;line-height:1.6;color:#b6bcc4">
    ${escapeHtml(opts.workspaceName)} added this address as an alert destination in APIDiffGuard.
    Alerts are withheld until you confirm.
  </p>
  <p style="margin:24px 0 0"><a href="${escapeHtml(opts.verifyUrl)}" style="background:#4F7FFF;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block">Confirm address</a></p>
  <p style="margin:24px 0 0;font-size:12px;color:#7b828b">
    The link expires in 24 hours. If you weren't expecting this, ignore it — nothing will be sent here.
  </p>
</div>`;
  const text = `${opts.workspaceName} added this address as an alert destination in APIDiffGuard.\n\nConfirm: ${opts.verifyUrl}\n\nThe link expires in 24 hours. If you weren't expecting this, ignore it — nothing will be sent here.`;
  return { subject, html, text };
}

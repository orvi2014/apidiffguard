import {
  emailConfigured,
  isValidEmail,
  renderAlertEmail,
  sendEmail,
} from "@/lib/alerts/email";
import { safeFetch } from "@/lib/safe-fetch";
import { parseAndAssertPublicUrl } from "@/lib/safe-url";

export type DeliverableChannel =
  | "EMAIL"
  | "SLACK"
  | "DISCORD"
  | "MATTERMOST"
  | "WEBHOOK";

export type DeliveryResult = {
  ok: boolean;
  status: "SENT" | "FAILED";
  error?: string;
  payload?: Record<string, unknown>;
};

function targetFromConfig(
  channel: DeliverableChannel,
  config: Record<string, unknown>
): string | null {
  if (channel === "EMAIL" && typeof config.email === "string") return config.email;
  if (channel === "WEBHOOK" && typeof config.url === "string") return config.url;
  if (
    (channel === "SLACK" ||
      channel === "DISCORD" ||
      channel === "MATTERMOST") &&
    typeof config.webhookUrl === "string"
  ) {
    return config.webhookUrl;
  }
  return null;
}

/**
 * The body each chat platform expects.
 *
 * Mattermost incoming webhooks accept Slack's shape verbatim — a `text` field,
 * single-asterisk bold — so the two share a branch rather than a transport.
 * A generic WEBHOOK gets the structured payload instead, which is why pointing
 * a Mattermost URL at that channel fails: Mattermost rejects a body with no
 * `text` key.
 */
export function renderChannelPayload(
  channel: DeliverableChannel,
  message: string,
  structured: Record<string, unknown>
): Record<string, unknown> {
  if (channel === "SLACK" || channel === "MATTERMOST") {
    return { text: `*APIDiffGuard*\n${message}` };
  }
  if (channel === "DISCORD") {
    return { content: `**APIDiffGuard**\n${message}` };
  }
  return structured;
}

export async function deliverAlert(opts: {
  channel: DeliverableChannel;
  config: Record<string, unknown>;
  message: string;
  severity: string;
  event?: string;
  meta?: Record<string, unknown>;
  /** EMAIL only: whether the destination address has confirmed. */
  verified?: boolean;
}): Promise<DeliveryResult> {
  const target = targetFromConfig(opts.channel, opts.config);
  if (!target) {
    return { ok: false, status: "FAILED", error: "Missing destination" };
  }

  const body = {
    source: "apidiffguard",
    event: opts.event ?? "alert.test",
    severity: opts.severity,
    message: opts.message,
    sentAt: new Date().toISOString(),
    ...(opts.meta ?? {}),
  };

  if (opts.channel === "EMAIL") {
    const payload = { ...body, channel: "EMAIL", email: target };

    if (!emailConfigured()) {
      return {
        ok: false,
        status: "FAILED",
        error:
          "Email delivery is not configured on this server (RESEND_API_KEY and ALERT_FROM_EMAIL).",
        payload,
      };
    }
    if (!isValidEmail(target)) {
      return {
        ok: false,
        status: "FAILED",
        error: "Invalid destination address.",
        payload,
      };
    }
    // Withheld rather than sent: an unconfirmed address is someone else's
    // inbox until they say otherwise.
    if (!opts.verified) {
      return {
        ok: false,
        status: "FAILED",
        error: "This address has not confirmed yet, so the alert was withheld.",
        payload,
      };
    }

    const meta = opts.meta ?? {};
    const diffId = typeof meta.diffId === "string" ? meta.diffId : null;
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
      "http://localhost:3000";

    const rendered = renderAlertEmail({
      severity: opts.severity,
      message: opts.message,
      endpointName:
        typeof meta.endpointName === "string" ? meta.endpointName : undefined,
      diffUrl: diffId ? `${appUrl}/diff/${diffId}` : null,
    });

    const sent = await sendEmail({ to: target, ...rendered });
    if (!sent.ok) {
      return { ok: false, status: "FAILED", error: sent.error, payload };
    }
    return {
      ok: true,
      status: "SENT",
      payload: { ...payload, providerId: sent.id },
    };
  }

  try {
    // https only — alert payloads carry endpoint names and diff summaries, and
    // create-time validation already requires https. Rows written any other way
    // (imports, direct DB writes) must not silently downgrade to cleartext.
    parseAndAssertPublicUrl(target, { requireHttps: true });
  } catch (err) {
    return {
      ok: false,
      status: "FAILED",
      error: err instanceof Error ? err.message : "Invalid webhook URL",
      payload: body,
    };
  }

  try {
    const payload = renderChannelPayload(opts.channel, opts.message, body);

    const res = await safeFetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      timeoutMs: 12_000,
    });

    if (!res.ok) {
      return {
        ok: false,
        status: "FAILED",
        error: `HTTP ${res.status}`,
        payload: body,
      };
    }

    return {
      ok: true,
      status: "SENT",
      payload: { ...body, channel: opts.channel, httpStatus: res.status },
    };
  } catch (err) {
    return {
      ok: false,
      status: "FAILED",
      error: err instanceof Error ? err.message : "Delivery failed",
      payload: body,
    };
  }
}

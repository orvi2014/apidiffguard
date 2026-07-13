import {
  parseAndAssertPublicUrl,
  safeFetch,
} from "@/lib/safe-url";

export type DeliverableChannel = "EMAIL" | "SLACK" | "DISCORD" | "WEBHOOK";

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
    (channel === "SLACK" || channel === "DISCORD") &&
    typeof config.webhookUrl === "string"
  ) {
    return config.webhookUrl;
  }
  return null;
}

export async function deliverAlert(opts: {
  channel: DeliverableChannel;
  config: Record<string, unknown>;
  message: string;
  severity: string;
  event?: string;
  meta?: Record<string, unknown>;
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
    return {
      ok: false,
      status: "FAILED",
      error:
        "Email delivery is not configured yet. Use Slack, Discord, or a webhook channel.",
      payload: { ...body, channel: "EMAIL", email: target },
    };
  }

  try {
    parseAndAssertPublicUrl(target);
  } catch (err) {
    return {
      ok: false,
      status: "FAILED",
      error: err instanceof Error ? err.message : "Invalid webhook URL",
      payload: body,
    };
  }

  try {
    const payload =
      opts.channel === "SLACK"
        ? { text: `*APIDiffGuard*\n${opts.message}` }
        : opts.channel === "DISCORD"
          ? { content: `**APIDiffGuard**\n${opts.message}` }
          : body;

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

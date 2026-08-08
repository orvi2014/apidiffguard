import type { SupabaseClient } from "@supabase/supabase-js";
import {
  deliverAlert,
  type DeliverableChannel,
} from "@/lib/alerts/deliver";
import { enqueueFailedDelivery } from "@/lib/alerts/retry-queue";

/**
 * Build outbound headers for an endpoint.
 *
 * Credentials arrive as an already-decrypted map rather than being read off the
 * row: `auth_config` is stored sealed and is not selectable by any user-facing
 * role, so decryption is a deliberate step taken by the caller that is about to
 * make the request. Keeping it out of here also keeps this function pure.
 */
export function authHeadersFromEndpoint(
  endpoint: {
    auth_type?: string | null;
    headers?: unknown;
  },
  credentials: Record<string, string> = {}
): Record<string, string> {
  const out: Record<string, string> = {};
  if (endpoint.headers && typeof endpoint.headers === "object") {
    for (const [k, v] of Object.entries(
      endpoint.headers as Record<string, unknown>
    )) {
      if (k.startsWith("__adg_")) continue;
      if (typeof v === "string" && v) out[k] = v;
    }
  }
  const config = credentials;
  const type = String(endpoint.auth_type ?? "NONE").toUpperCase();
  if (type === "BEARER" || type === "OAUTH") {
    if (config.token) out.Authorization = `Bearer ${config.token}`;
  } else if (type === "API_KEY") {
    const header = config.header || "X-API-Key";
    if (config.key) out[header] = config.key;
  } else if (type === "BASIC") {
    const user = config.username ?? "";
    const pass = config.password ?? "";
    if (user) {
      out.Authorization = `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;
    }
  } else if (type === "CUSTOM") {
    if (config.header && config.value) out[config.header] = config.value;
  }
  return out;
}

export function requestBodyFromEndpoint(endpoint: {
  headers?: unknown;
}): string | undefined {
  if (!endpoint.headers || typeof endpoint.headers !== "object") return undefined;
  const body = (endpoint.headers as Record<string, unknown>).__adg_body;
  return typeof body === "string" && body.length > 0 ? body : undefined;
}

export function buildStoredHeaders(opts: {
  contentType?: string;
  requestBody?: string;
  extra?: Record<string, string>;
}): Record<string, string> {
  const headers: Record<string, string> = { ...(opts.extra ?? {}) };
  if (opts.contentType) headers["Content-Type"] = opts.contentType;
  if (opts.requestBody) headers.__adg_body = opts.requestBody;
  return headers;
}

const SEVERITY_RANK = { INFO: 0, WARNING: 1, BREAKING: 2 } as const;

export type Severity = keyof typeof SEVERITY_RANK;

function isSeverity(value: string): value is Severity {
  return Object.prototype.hasOwnProperty.call(SEVERITY_RANK, value);
}

/**
 * Compare a diff's severity against a channel's configured minimum.
 *
 * An unrecognised minimum is a data bug, not a routing decision — silently
 * treating it as WARNING would drop BREAKING alerts on a typo'd row, so throw
 * and let the caller decide.
 */
export function severityMeetsMinimum(
  actual: Severity,
  minimum: string
): boolean {
  const min = minimum.toUpperCase();
  if (!isSeverity(min)) {
    throw new Error(`Unknown alert severity threshold: ${minimum}`);
  }
  return SEVERITY_RANK[actual] >= SEVERITY_RANK[min];
}

export async function fanOutWorkspaceAlerts(
  supabase: SupabaseClient,
  opts: {
    workspaceId: string;
    endpointId: string;
    endpointName: string;
    severity: "INFO" | "WARNING" | "BREAKING";
    message: string;
    diffId?: string | null;
    /** Stable key for cooldown grouping. Defaults to severity + message. */
    fingerprint?: string;
  }
) {
  const { data: configs } = await supabase
    .from("alert_configs")
    .select(
      "id, channel, config, min_severity, enabled, cooldown_minutes, verified_at"
    )
    .eq("workspace_id", opts.workspaceId)
    .eq("enabled", true);

  if (!configs?.length) return { sent: 0, failed: 0, suppressed: 0 };

  const severityMatched = configs.filter((config) => {
    try {
      return severityMeetsMinimum(opts.severity, String(config.min_severity));
    } catch {
      // Corrupt threshold: deliver rather than drop. A noisy alert beats a
      // missed breaking change.
      return true;
    }
  });

  if (!severityMatched.length) return { sent: 0, failed: 0, suppressed: 0 };

  // Suppress repeats: a permanently broken endpoint would otherwise re-alert on
  // every scheduled run. The fingerprint keys on what actually changed, so a
  // *different* break still gets through immediately.
  const fingerprint = opts.fingerprint ?? `${opts.severity}:${opts.message}`;
  const now = Date.now();

  const { data: cooldownRows } = await supabase
    .from("alert_cooldowns")
    .select("alert_config_id, last_sent_at")
    .eq("endpoint_id", opts.endpointId)
    .eq("fingerprint", fingerprint)
    .in(
      "alert_config_id",
      severityMatched.map((c) => c.id)
    );

  const lastSentByConfig = new Map<string, number>();
  for (const row of cooldownRows ?? []) {
    lastSentByConfig.set(
      String(row.alert_config_id),
      new Date(row.last_sent_at).getTime()
    );
  }

  const matching: typeof severityMatched = [];
  let suppressed = 0;

  for (const config of severityMatched) {
    const cooldownMinutes = Number(config.cooldown_minutes ?? 60);
    const lastSent = lastSentByConfig.get(String(config.id));
    const withinCooldown =
      cooldownMinutes > 0 &&
      lastSent !== undefined &&
      now - lastSent < cooldownMinutes * 60_000;

    if (withinCooldown) {
      suppressed += 1;
      await supabase
        .from("alert_cooldowns")
        .update({ suppressed_count: (cooldownRows ?? []).length })
        .eq("alert_config_id", config.id)
        .eq("endpoint_id", opts.endpointId)
        .eq("fingerprint", fingerprint);
      continue;
    }

    matching.push(config);
  }

  if (!matching.length) return { sent: 0, failed: 0, suppressed };

  // Deliver concurrently. Several channels at a 12s timeout each would
  // otherwise burn the route's whole 60s budget on alerting alone.
  const settled = await Promise.allSettled(
    matching.map(async (config) => {
      const delivery = await deliverAlert({
        channel: config.channel as DeliverableChannel,
        config: (config.config ?? {}) as Record<string, unknown>,
        message: opts.message,
        severity: opts.severity,
        event: "diff.detected",
        verified: Boolean(config.verified_at),
        meta: {
          endpointId: opts.endpointId,
          endpointName: opts.endpointName,
          diffId: opts.diffId ?? null,
        },
      });

      await supabase.from("alert_history").insert({
        alert_config_id: config.id,
        status: delivery.status,
        severity: opts.severity,
        message: opts.message,
        payload: delivery.payload ?? null,
        error: delivery.error ?? null,
        sent_at: delivery.ok ? new Date().toISOString() : null,
      });

      if (!delivery.ok) {
        // Park it for the retry drain instead of losing it. A transient 429 or
        // a webhook host that is briefly down used to mean the alert simply
        // never arrived.
        await enqueueFailedDelivery(supabase, {
          alertConfigId: String(config.id),
          workspaceId: opts.workspaceId,
          endpointId: opts.endpointId,
          severity: opts.severity,
          message: opts.message,
          fingerprint,
          error: delivery.error,
          meta: {
            endpointId: opts.endpointId,
            endpointName: opts.endpointName,
            diffId: opts.diffId ?? null,
          },
        });
      }

      // Only a successful send starts the cooldown — a failed delivery should
      // be retried on the next run, not suppressed as if it had gone out.
      if (delivery.ok) {
        await supabase.from("alert_cooldowns").upsert(
          {
            alert_config_id: config.id,
            endpoint_id: opts.endpointId,
            fingerprint,
            last_sent_at: new Date().toISOString(),
            suppressed_count: 0,
          },
          { onConflict: "alert_config_id,endpoint_id,fingerprint" }
        );
      }

      return delivery.ok;
    })
  );

  let sent = 0;
  let failed = 0;
  for (const result of settled) {
    if (result.status === "fulfilled" && result.value) sent += 1;
    else failed += 1;
  }

  if (sent > 0) {
    await supabase.from("activities").insert({
      type: "alert_sent",
      title: `Alert sent · ${opts.endpointName}`,
      description: opts.message,
      workspace_id: opts.workspaceId,
      metadata: opts.diffId
        ? { diffId: opts.diffId, endpointId: opts.endpointId }
        : { endpointId: opts.endpointId },
    });
  }

  return { sent, failed, suppressed };
}

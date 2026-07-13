import type { SupabaseClient } from "@supabase/supabase-js";
import {
  deliverAlert,
  type DeliverableChannel,
} from "@/lib/alerts/deliver";

export function authHeadersFromEndpoint(endpoint: {
  auth_type?: string | null;
  auth_config?: unknown;
  headers?: unknown;
}): Record<string, string> {
  const out: Record<string, string> = {};
  if (endpoint.headers && typeof endpoint.headers === "object") {
    for (const [k, v] of Object.entries(
      endpoint.headers as Record<string, unknown>
    )) {
      if (k.startsWith("__adg_")) continue;
      if (typeof v === "string" && v) out[k] = v;
    }
  }
  const config =
    endpoint.auth_config && typeof endpoint.auth_config === "object"
      ? (endpoint.auth_config as Record<string, string>)
      : {};
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

export function severityMeetsMinimum(
  actual: keyof typeof SEVERITY_RANK,
  minimum: string
): boolean {
  const min = minimum.toUpperCase() as keyof typeof SEVERITY_RANK;
  const minRank = SEVERITY_RANK[min] ?? SEVERITY_RANK.WARNING;
  return SEVERITY_RANK[actual] >= minRank;
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
  }
) {
  const { data: configs } = await supabase
    .from("alert_configs")
    .select("id, channel, config, min_severity, enabled")
    .eq("workspace_id", opts.workspaceId)
    .eq("enabled", true);

  if (!configs?.length) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;

  for (const config of configs) {
    if (!severityMeetsMinimum(opts.severity, String(config.min_severity))) {
      continue;
    }

    const delivery = await deliverAlert({
      channel: config.channel as DeliverableChannel,
      config: (config.config ?? {}) as Record<string, unknown>,
      message: opts.message,
      severity: opts.severity,
      event: "diff.detected",
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

    if (delivery.ok) sent += 1;
    else failed += 1;
  }

  if (sent > 0) {
    await supabase.from("activities").insert({
      type: "alert_sent",
      title: `Alert sent · ${opts.endpointName}`,
      description: opts.message,
      workspace_id: opts.workspaceId,
      endpoint_id: opts.endpointId,
      metadata: opts.diffId ? { diffId: opts.diffId } : null,
    });
  }

  return { sent, failed };
}

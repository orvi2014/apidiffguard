import type { SupabaseClient } from "@supabase/supabase-js";
import {
  compareHeaders,
  compareJson,
  summarizeChanges,
} from "@/lib/diff-engine";
import {
  authHeadersFromEndpoint,
  fanOutWorkspaceAlerts,
  requestBodyFromEndpoint,
} from "@/lib/endpoint-auth";
import { runHttpCheck } from "@/lib/http-check";

export type RunEndpointCheckResult =
  | {
      success: true;
      diffId?: string;
      breakingCount: number;
      warningCount: number;
      changeCount: number;
      alertsSent?: number;
    }
  | { error: string };

export async function runEndpointCheck(
  supabase: SupabaseClient,
  opts: {
    endpointId: string;
    workspaceId: string;
  }
): Promise<RunEndpointCheckResult> {
  const { data: endpoint } = await supabase
    .from("endpoints")
    .select("*")
    .eq("id", opts.endpointId)
    .eq("workspace_id", opts.workspaceId)
    .single();

  if (!endpoint) return { error: "Endpoint not found." };

  const { data: baseline } = await supabase
    .from("baselines")
    .select("*")
    .eq("endpoint_id", opts.endpointId)
    .eq("is_active", true)
    .maybeSingle();

  if (!baseline) {
    return { error: "Capture a baseline before running a check." };
  }

  const { data: ignoreRows } = await supabase
    .from("ignore_rules")
    .select("path")
    .eq("endpoint_id", opts.endpointId);
  const ignorePaths = (ignoreRows ?? [])
    .map((r) => r.path)
    .filter((p): p is string => typeof p === "string" && p.length > 0);

  await supabase
    .from("endpoints")
    .update({ health: "CHECKING" })
    .eq("id", opts.endpointId);

  const result = await runHttpCheck({
    url: endpoint.url,
    method: endpoint.method,
    timeoutMs: endpoint.timeout_ms,
    headers: authHeadersFromEndpoint(endpoint),
    body: requestBodyFromEndpoint(endpoint),
  });

  if (result.error && result.statusCode === 0) {
    await supabase
      .from("endpoints")
      .update({ health: "UNKNOWN" })
      .eq("id", opts.endpointId);
    return { error: result.error };
  }

  const checkStatus =
    result.statusCode >= 200 && result.statusCode < 400 ? "SUCCESS" : "FAILED";

  const { data: checkRow } = await supabase
    .from("checks")
    .insert({
      endpoint_id: opts.endpointId,
      status: checkStatus,
      status_code: result.statusCode,
      headers: result.headers,
      body: result.body,
      response_time: result.responseTime,
      content_size: result.contentSize,
      finished_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  const changes = [
    ...compareJson(baseline.body, result.body, { ignorePaths }),
    ...compareHeaders(
      (baseline.headers ?? {}) as Record<string, string>,
      result.headers
    ),
  ];
  if (baseline.status_code !== result.statusCode) {
    changes.unshift({
      id: "chg_status",
      path: "$status",
      type: "status_changed",
      severity: "breaking",
      oldValue: baseline.status_code,
      newValue: result.statusCode,
      message: `HTTP status changed ${baseline.status_code} → ${result.statusCode}`,
    });
  }

  const summary = summarizeChanges(changes);
  const health =
    summary.breakingCount > 0
      ? "BREAKING"
      : summary.warningCount > 0
        ? "WARNING"
        : "HEALTHY";

  const { data: diff } = await supabase
    .from("diffs")
    .insert({
      endpoint_id: opts.endpointId,
      baseline_id: baseline.id,
      check_id: checkRow?.id ?? null,
      summary,
      changes,
      breaking_count: summary.breakingCount,
      warning_count: summary.warningCount,
      info_count: summary.infoCount,
    })
    .select("id")
    .single();

  await supabase
    .from("endpoints")
    .update({
      health,
      response_time: result.responseTime,
      last_checked_at: new Date().toISOString(),
      breaking_count: summary.breakingCount,
      warning_count: summary.warningCount,
    })
    .eq("id", opts.endpointId);

  await supabase.from("activities").insert({
    type: summary.breakingCount ? "diff_detected" : "check_run",
    title: summary.breakingCount
      ? `Breaking changes on ${endpoint.name}`
      : `Check completed · ${endpoint.name}`,
    description: `${summary.breakingCount} breaking · ${summary.warningCount} warnings`,
    workspace_id: opts.workspaceId,
    metadata: diff ? { diffId: diff.id } : null,
  });

  let alertsSent = 0;
  if (summary.breakingCount > 0 || summary.warningCount > 0) {
    const severity =
      summary.breakingCount > 0 ? ("BREAKING" as const) : ("WARNING" as const);
    const fanout = await fanOutWorkspaceAlerts(supabase, {
      workspaceId: opts.workspaceId,
      endpointId: opts.endpointId,
      endpointName: endpoint.name,
      severity,
      message: `${endpoint.name}: ${summary.breakingCount} breaking · ${summary.warningCount} warnings`,
      diffId: diff?.id,
    });
    alertsSent = fanout.sent;
  }

  return {
    success: true,
    diffId: diff?.id,
    breakingCount: summary.breakingCount,
    warningCount: summary.warningCount,
    changeCount: changes.length,
    alertsSent,
  };
}

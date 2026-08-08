import type { SupabaseClient } from "@supabase/supabase-js";
import { validateAgainstSchema } from "@/lib/contract-validate";
import {
  compareHeaders,
  compareJson,
  compareStatusCodes,
  summarizeChanges,
} from "@/lib/diff-engine";
import {
  authHeadersFromEndpoint,
  fanOutWorkspaceAlerts,
  requestBodyFromEndpoint,
} from "@/lib/endpoint-auth";
import {
  ENDPOINT_COLUMNS,
  loadEndpointCredentials,
} from "@/lib/endpoint-secrets";
import { runHttpCheck } from "@/lib/http-check";
import {
  hydrateResponseBody,
  storeResponseBody,
} from "@/lib/response-body-store";

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
  },
): Promise<RunEndpointCheckResult> {
  const { data: endpoint } = await supabase
    .from("endpoints")
    .select(ENDPOINT_COLUMNS)
    .eq("id", opts.endpointId)
    .eq("workspace_id", opts.workspaceId)
    .single();

  if (!endpoint) return { error: "Endpoint not found." };

  // Newest-active wins. Baseline promotion activates the new row before
  // deactivating the old one (so the endpoint is never left with no baseline),
  // which means two rows can briefly be active at once.
  const { data: baseline } = await supabase
    .from("baselines")
    .select("*")
    .eq("endpoint_id", opts.endpointId)
    .eq("is_active", true)
    .order("version", { ascending: false })
    .limit(1)
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

  // Reserved before the request goes out, not after: the outbound traffic is
  // the thing being metered, and a check that fails still consumed it.
  const { data: quota, error: quotaError } = await supabase
    .rpc("consume_check_quota", { p_workspace_id: opts.workspaceId })
    .single<{ allowed: boolean; used: number; quota: number | null }>();

  if (quotaError) {
    return { error: `Could not reserve check quota: ${quotaError.message}` };
  }
  if (quota && !quota.allowed) {
    return {
      error: `Monthly check limit reached (${quota.used} of ${quota.quota}). Upgrade in Settings → Billing or wait for the next billing period.`,
    };
  }

  await supabase
    .from("endpoints")
    .update({ health: "CHECKING" })
    .eq("id", opts.endpointId);

  // Anything that throws between here and the final health write would leave
  // the endpoint stuck on CHECKING forever, so the transient state is always
  // released. `settled` is flipped by whichever path writes a real health.
  let settled = false;
  const releaseIfStuck = async () => {
    if (settled) return;
    await supabase
      .from("endpoints")
      .update({ health: "UNKNOWN" })
      .eq("id", opts.endpointId);
  };

  let result: Awaited<ReturnType<typeof runHttpCheck>>;
  try {
    // Decrypted here and nowhere else: the credential is in memory only for the
    // request it authenticates.
    const credentials = await loadEndpointCredentials(opts.endpointId);
    result = await runHttpCheck({
      url: endpoint.url,
      method: endpoint.method,
      timeoutMs: endpoint.timeout_ms,
      headers: authHeadersFromEndpoint(endpoint, credentials),
      body: requestBodyFromEndpoint(endpoint),
    });
  } catch (err) {
    await releaseIfStuck();
    return {
      error: err instanceof Error ? err.message : "Check failed unexpectedly.",
    };
  }

  if (result.error && result.statusCode === 0) {
    settled = true;
    await supabase
      .from("endpoints")
      .update({ health: "UNKNOWN" })
      .eq("id", opts.endpointId);
    return { error: result.error };
  }

  try {
    const checkStatus =
      result.statusCode >= 200 && result.statusCode < 400
        ? "SUCCESS"
        : "FAILED";

    const diffMode =
      endpoint.diff_mode === "full" ? ("full" as const) : ("schema" as const);
    const schemaOnly = diffMode === "schema";

    // The baseline's body may have been offloaded; the diff needs the real
    // content, not the reference.
    const baselineBody = await hydrateResponseBody(baseline);

    const changes = [
      ...compareJson(baselineBody, result.body, {
        ignorePaths,
        schemaOnly,
        arrayIdentity: true,
      }),
      ...compareHeaders(
        (baseline.headers ?? {}) as Record<string, string>,
        result.headers,
      ),
    ];

    if (endpoint.response_schema) {
      changes.push(
        ...validateAgainstSchema(result.body, endpoint.response_schema),
      );
    }

    const statusChange = compareStatusCodes(
      baseline.status_code,
      result.statusCode,
    );
    if (statusChange) changes.unshift(statusChange);

    const summary = summarizeChanges(changes);
    const health =
      summary.breakingCount > 0
        ? "BREAKING"
        : summary.warningCount > 0
          ? "WARNING"
          : "HEALTHY";

    // One round trip, one transaction. The check row, the diff, the endpoint's
    // health and counters, and the activity entry either all land or none do —
    // previously a failure between them left the endpoint describing a state
    // that never occurred.
    const stored = await storeResponseBody(opts.endpointId, result.body);

    const { data: recorded, error: recordError } = await supabase
      .rpc("record_check_result", {
        p_endpoint_id: opts.endpointId,
        p_workspace_id: opts.workspaceId,
        p_baseline_id: baseline.id,
        p_check_status: checkStatus,
        p_status_code: result.statusCode,
        p_headers: result.headers,
        p_body: stored.body,
        p_body_ref: stored.bodyRef,
        p_response_time: result.responseTime,
        p_content_size: result.contentSize,
        p_health: health,
        p_summary: summary,
        p_changes: changes,
        p_breaking_count: summary.breakingCount,
        p_warning_count: summary.warningCount,
        p_info_count: summary.infoCount,
        p_activity_type: summary.breakingCount ? "diff_detected" : "check_run",
        p_activity_title: summary.breakingCount
          ? `Breaking changes on ${endpoint.name}`
          : `Check completed · ${endpoint.name}`,
        p_activity_description: `${summary.breakingCount} breaking · ${summary.warningCount} warnings`,
      })
      .single<{ check_id: string; diff_id: string }>();

    if (recordError) {
      return { error: `Could not record the check result: ${recordError.message}` };
    }

    const diff = recorded ? { id: recorded.diff_id } : null;
    // Real health is written — CHECKING is no longer outstanding.
    settled = true;

    let alertsSent = 0;
    if (summary.breakingCount > 0 || summary.warningCount > 0) {
      const severity =
        summary.breakingCount > 0
          ? ("BREAKING" as const)
          : ("WARNING" as const);
      // Fingerprint on *what* changed, not the rendered message. A persistently
      // broken endpoint keeps the same fingerprint and stays suppressed, while
      // a genuinely different break alerts straight away.
      const fingerprint = `${severity}:${[
        ...new Set(changes.map((c) => c.path)),
      ]
        .sort()
        .join("|")}`;

      const fanout = await fanOutWorkspaceAlerts(supabase, {
        workspaceId: opts.workspaceId,
        endpointId: opts.endpointId,
        endpointName: endpoint.name,
        severity,
        message: `${endpoint.name}: ${summary.breakingCount} breaking · ${summary.warningCount} warnings`,
        diffId: diff?.id,
        fingerprint,
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
  } finally {
    // Covers every throw after the CHECKING write — a Supabase error, a diff
    // engine crash, an alert failure. Without this the endpoint shows
    // "Checking…" indefinitely with nothing to clear it.
    await releaseIfStuck();
  }
}

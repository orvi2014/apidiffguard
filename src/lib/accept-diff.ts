import type { SupabaseClient } from "@supabase/supabase-js";
import { promoteBaseline } from "@/lib/baselines";
import { hydrateResponseBody } from "@/lib/response-body-store";

/**
 * Promote the response behind a diff to the endpoint's active baseline.
 *
 * Shared by the console's "Accept as baseline" action and
 * `POST /api/v1/diffs/:id/accept`. The workspace check lives here rather than
 * in either caller because the API route runs on the service client, where
 * row-level security does not stand behind a forgotten filter.
 */
export async function acceptDiff(
  supabase: SupabaseClient,
  opts: { diffId: string; workspaceId: string }
): Promise<
  | { ok: true; endpointId: string; baselineVersion: number }
  | { error: string; status: 404 | 409 | 500 }
> {
  const { data: diff } = await supabase
    .from("diffs")
    .select("id, endpoint_id, check_id, endpoints!inner(workspace_id)")
    .eq("id", opts.diffId)
    .maybeSingle();

  if (!diff) return { error: "Diff not found.", status: 404 };
  const endpoint = Array.isArray(diff.endpoints)
    ? diff.endpoints[0]
    : diff.endpoints;
  if (!endpoint || endpoint.workspace_id !== opts.workspaceId) {
    return { error: "Diff not found.", status: 404 };
  }
  if (!diff.check_id) {
    return { error: "Check for this diff was not found.", status: 409 };
  }

  const { data: check } = await supabase
    .from("checks")
    .select("body, body_ref, status_code, headers, response_time, content_size")
    .eq("id", diff.check_id)
    .single();

  if (!check) {
    return { error: "Check for this diff was not found.", status: 409 };
  }

  // A large body lives in object storage, so accepting a diff has to fetch the
  // real content before promoting it to a baseline.
  const checkBody = await hydrateResponseBody(check);

  const promoted = await promoteBaseline(supabase, {
    endpointId: diff.endpoint_id,
    body: checkBody,
    statusCode: check.status_code,
    headers: check.headers ?? {},
    responseTime: check.response_time ?? 0,
    contentSize: check.content_size ?? 0,
    notes: "Accepted from diff",
    approved: true,
  });

  if ("error" in promoted) return { error: promoted.error, status: 500 };
  const version = promoted.version;

  await supabase
    .from("diffs")
    .update({ accepted: true })
    .eq("id", opts.diffId);

  await supabase
    .from("endpoints")
    .update({
      health: "HEALTHY",
      baseline_version: version,
      last_checked_at: new Date().toISOString(),
      breaking_count: 0,
      warning_count: 0,
    })
    .eq("id", diff.endpoint_id);

  await supabase.from("activities").insert({
    type: "baseline_accepted",
    title: "Baseline accepted",
    description: "Diff response promoted to active baseline",
    workspace_id: opts.workspaceId,
    endpoint_id: diff.endpoint_id,
  });

  return { ok: true, endpointId: diff.endpoint_id, baselineVersion: version };
}

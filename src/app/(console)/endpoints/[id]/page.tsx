import { notFound, redirect } from "next/navigation";
import { EndpointDetailLive } from "@/components/domain/endpoint-detail-live";
import { createClient } from "@/lib/supabase/server";
import { canEditWorkspace } from "@/lib/plans";
import { getWorkspaceContext } from "@/lib/workspace";
import { mapEndpoint, type DbEndpoint } from "@/lib/mappers";
import type { Baseline } from "@/lib/types";

export default async function EndpointDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login");
  const canEdit = canEditWorkspace(ctx.role);

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("endpoints")
    .select(
      "id, name, url, method, environment, tags, description, health, auth_type, headers, last_checked_at, response_time, baseline_version, breaking_count, warning_count"
    )
    .eq("id", id)
    .eq("workspace_id", ctx.workspaceId)
    .maybeSingle();

  if (!row) notFound();

  const headers =
    row.headers && typeof row.headers === "object"
      ? (row.headers as Record<string, string>)
      : {};
  const requestBody = headers.__adg_body ?? "";
  const contentType = headers["Content-Type"] ?? "application/json";

  const [{ data: baselineRows }, { data: latestDiff }] = await Promise.all([
    supabase
      .from("baselines")
      .select(
        "id, version, status_code, response_time, content_size, notes, approved, is_active, created_at, endpoint_id"
      )
      .eq("endpoint_id", id)
      .order("version", { ascending: false })
      .limit(50),
    supabase
      .from("diffs")
      .select("id")
      .eq("endpoint_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const baselines: Baseline[] =
    baselineRows?.map((b) => ({
      id: b.id,
      version: b.version,
      statusCode: b.status_code,
      headers: {},
      body: null,
      responseTime: b.response_time,
      contentSize: b.content_size,
      notes: b.notes ?? undefined,
      approved: b.approved,
      isActive: b.is_active,
      createdAt: b.created_at,
      endpointId: b.endpoint_id,
    })) ?? [];

  return (
    <EndpointDetailLive
      endpoint={mapEndpoint(row as DbEndpoint)}
      baselines={baselines}
      latestDiffId={latestDiff?.id}
      requestBody={requestBody}
      contentType={contentType}
      canEdit={canEdit}
    />
  );
}

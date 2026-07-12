import { notFound, redirect } from "next/navigation";
import { EndpointDetailLive } from "@/components/domain/endpoint-detail-live";
import { createClient } from "@/lib/supabase/server";
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

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("endpoints")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", ctx.workspaceId)
    .maybeSingle();

  if (!row) notFound();

  const { data: baselineRows } = await supabase
    .from("baselines")
    .select("*")
    .eq("endpoint_id", id)
    .order("version", { ascending: false });

  const { data: latestDiff } = await supabase
    .from("diffs")
    .select("id")
    .eq("endpoint_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const baselines: Baseline[] =
    baselineRows?.map((b) => ({
      id: b.id,
      version: b.version,
      statusCode: b.status_code,
      headers: (b.headers as Record<string, string>) ?? {},
      body: b.body,
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
    />
  );
}

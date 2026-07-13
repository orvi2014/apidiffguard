import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { DiffViewer } from "@/components/diff/diff-viewer";
import { EmptyState } from "@/components/domain/activity";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";
import { listWorkspaceEndpointIds } from "@/lib/workspace-data";
import type { DiffChange, DiffResult } from "@/lib/types";

export const metadata = { title: "Diff" };

function EmptyDiffs() {
  return (
    <EmptyState
      title="No diffs yet"
      description="Run a check after capturing a baseline to generate a diff."
      action={
        <Link href="/endpoints">
          <Button size="sm" variant="secondary">
            Go to endpoints
          </Button>
        </Link>
      }
    />
  );
}

export default async function DiffPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  let { id } = await params;
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login");

  const supabase = await createClient();

  // Resolve "latest" in-place — no second navigation hop.
  if (id === "latest") {
    const endpointIds = await listWorkspaceEndpointIds(ctx.workspaceId);
    if (!endpointIds.length) return <EmptyDiffs />;

    const { data: latest } = await supabase
      .from("diffs")
      .select("id")
      .in("endpoint_id", endpointIds)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latest) return <EmptyDiffs />;
    id = latest.id;
  }

  // Metadata + changes only — response bodies load on demand for tree/raw tabs.
  const { data: row } = await supabase
    .from("diffs")
    .select(
      `
      id, created_at, breaking_count, warning_count, info_count, accepted, changes,
      endpoints!inner(id, name, workspace_id),
      baselines(version, status_code, response_time, content_size),
      checks(status_code, response_time, content_size)
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (!row) notFound();

  const endpoint = Array.isArray(row.endpoints) ? row.endpoints[0] : row.endpoints;
  if (!endpoint || endpoint.workspace_id !== ctx.workspaceId) notFound();

  const baseline = Array.isArray(row.baselines) ? row.baselines[0] : row.baselines;
  const check = Array.isArray(row.checks) ? row.checks[0] : row.checks;

  if (!baseline || !check) {
    return (
      <EmptyState
        title="Diff incomplete"
        description="Baseline or check data is missing for this diff."
        action={
          <Link href={`/endpoints/${endpoint.id}`}>
            <Button size="sm" variant="secondary">
              Back to endpoint
            </Button>
          </Link>
        }
      />
    );
  }

  const diff: DiffResult = {
    id: row.id,
    endpointId: endpoint.id,
    endpointName: endpoint.name,
    createdAt: row.created_at,
    breakingCount: row.breaking_count,
    warningCount: row.warning_count,
    infoCount: row.info_count,
    accepted: row.accepted,
    changes: (row.changes as DiffChange[]) ?? [],
    baseline: {
      version: baseline.version,
      statusCode: baseline.status_code,
      responseTime: baseline.response_time,
      contentSize: baseline.content_size,
    },
    current: {
      statusCode: check.status_code ?? 0,
      responseTime: check.response_time ?? 0,
      contentSize: check.content_size ?? 0,
    },
  };

  return <DiffViewer diff={diff} />;
}

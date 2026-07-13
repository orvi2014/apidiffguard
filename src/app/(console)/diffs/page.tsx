import Link from "next/link";
import { redirect } from "next/navigation";
import { MethodBadge, SeverityBadge } from "@/components/domain/badges";
import { EmptyState } from "@/components/domain/activity";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";
import { listWorkspaceEndpointIds } from "@/lib/workspace-data";
import type { HttpMethod } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";

export const metadata = { title: "Diffs" };

export default async function DiffsListPage() {
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login");

  const endpointIds = await listWorkspaceEndpointIds(ctx.workspaceId);
  if (!endpointIds.length) {
    return (
      <EmptyState
        title="No diffs yet"
        description="Add an endpoint and run a check after capturing a baseline."
        action={
          <Link href="/endpoints/new">
            <Button size="sm">New endpoint</Button>
          </Link>
        }
      />
    );
  }

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("diffs")
    .select(
      `
      id, created_at, breaking_count, warning_count, info_count, accepted,
      endpoints!inner(id, name, method)
    `
    )
    .in("endpoint_id", endpointIds)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!rows?.length) {
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

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border px-5 py-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Diffs</h1>
            <p className="mt-1 text-sm text-muted">
              Recent response comparisons across your workspace.
            </p>
          </div>
          <Button asChild size="sm" variant="secondary">
            <Link href="/diff/latest">Open latest</Link>
          </Button>
        </div>
      </div>

      <div className="hidden border-b border-border-subtle px-5 py-2 text-[11px] uppercase tracking-wider text-muted sm:grid sm:grid-cols-[1fr_100px_100px_100px_120px] sm:gap-4">
        <span>Endpoint</span>
        <span>Breaking</span>
        <span>Warnings</span>
        <span>Status</span>
        <span className="text-right">When</span>
      </div>

      <div className="flex-1 overflow-auto">
        {rows.map((row) => {
          const ep = Array.isArray(row.endpoints)
            ? row.endpoints[0]
            : row.endpoints;
          const severity =
            (row.breaking_count ?? 0) > 0
              ? "breaking"
              : (row.warning_count ?? 0) > 0
                ? "warning"
                : "info";
          return (
            <Link
              key={row.id}
              href={`/diff/${row.id}`}
              className="grid grid-cols-1 gap-2 border-b border-border-subtle px-5 py-3.5 transition-colors hover:bg-surface/40 sm:grid-cols-[1fr_100px_100px_100px_120px] sm:items-center sm:gap-4"
            >
              <div className="flex min-w-0 items-center gap-2">
                {ep?.method ? (
                  <MethodBadge method={ep.method as HttpMethod} />
                ) : null}
                <span className="truncate text-sm font-medium">
                  {ep?.name ?? "Endpoint"}
                </span>
              </div>
              <span className="font-mono text-xs tabular-nums text-danger">
                {row.breaking_count ?? 0}
              </span>
              <span className="font-mono text-xs tabular-nums text-warning">
                {row.warning_count ?? 0}
              </span>
              <span>
                {row.accepted ? (
                  <span className="text-xs text-success">Accepted</span>
                ) : (
                  <SeverityBadge severity={severity} />
                )}
              </span>
              <span className="text-right text-xs text-muted">
                {formatRelativeTime(row.created_at)}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

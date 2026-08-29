import Link from "next/link";
import { redirect } from "next/navigation";
import { MethodBadge, SeverityBadge } from "@/components/domain/badges";
import { EmptyState } from "@/components/domain/activity";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";
import { Pagination, parsePage } from "@/components/domain/pagination";
import type { HttpMethod } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";

export const metadata = { title: "Diffs" };

const PAGE_SIZE = 50;

export default async function DiffsListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login");

  const page = parsePage((await searchParams).page);
  const from = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();
  // Join on the workspace and ask for an exact count so the pager knows the
  // real total rather than silently truncating at the page size.
  const { data: rows, count } = await supabase
    .from("diffs")
    .select(
      `
      id, created_at, breaking_count, warning_count, info_count, accepted,
      endpoints!inner(id, name, method, workspace_id)
    `,
      { count: "exact" }
    )
    .eq("endpoints.workspace_id", ctx.workspaceId)
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

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
      <PageHeader
        title="Diffs"
        description="Recent response comparisons across your workspace."
        actions={
          <Button asChild size="sm" variant="secondary">
            <Link href="/diff/latest">Open latest</Link>
          </Button>
        }
      />

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

      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={count ?? rows.length}
        basePath="/diffs"
      />
    </div>
  );
}

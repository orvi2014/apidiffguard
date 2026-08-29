import Link from "next/link";
import { redirect } from "next/navigation";
import { FileJson, Plus } from "lucide-react";
import { HealthBadge } from "@/components/domain/badges";
import { EndpointsList } from "@/components/domain/endpoints-list";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { pluralize } from "@/lib/utils";
import { canEditWorkspace } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";
import { mapEndpoint, type DbEndpoint } from "@/lib/mappers";
import { Pagination, parsePage } from "@/components/domain/pagination";

export const metadata = { title: "Endpoints" };

const PAGE_SIZE = 50;

export default async function EndpointsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login");
  const canEdit = canEditWorkspace(ctx.role);

  const page = parsePage((await searchParams).page);
  const from = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();
  const { data, count } = await supabase
    .from("endpoints")
    .select(
      "id, name, url, method, environment, tags, description, health, auth_type, last_checked_at, response_time, baseline_version, breaking_count, warning_count",
      { count: "exact" }
    )
    .eq("workspace_id", ctx.workspaceId)
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const endpoints = (data as DbEndpoint[] | null)?.map(mapEndpoint) ?? [];
  const total = count ?? endpoints.length;
  const breaking = endpoints.filter((e) => e.health === "breaking").length;
  const warning = endpoints.filter((e) => e.health === "warning").length;
  const healthy = endpoints.filter((e) => e.health === "healthy").length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="Endpoints"
        description={
          <>
            {pluralize(total, "endpoint")} monitored
            {breaking > 0 ? ` · ${breaking} breaking on this page` : ""} ·{" "}
            {ctx.workspaceName}
          </>
        }
        actions={
          canEdit ? (
            <>
              <Link href="/endpoints/import">
                <Button size="sm" variant="secondary" className="gap-1.5">
                  <FileJson className="size-3.5" />
                  Import
                </Button>
              </Link>
              <Link href="/endpoints/new">
                <Button size="sm" className="gap-1.5">
                  <Plus className="size-3.5" />
                  New endpoint
                </Button>
              </Link>
            </>
          ) : (
            <p className="text-xs text-muted">View-only access</p>
          )
        }
      />

      <EndpointsList endpoints={endpoints} />

      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        basePath="/endpoints"
      />

      <div className="flex items-center gap-3 border-t border-border px-4 py-2 text-[11px] text-muted">
        <HealthBadge status="breaking" />
        <span>{breaking}</span>
        <HealthBadge status="warning" />
        <span>{warning}</span>
        <HealthBadge status="healthy" />
        <span>{healthy}</span>
        <span className="ml-auto">{total} total</span>
      </div>
    </div>
  );
}

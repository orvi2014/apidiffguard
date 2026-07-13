import Link from "next/link";
import { redirect } from "next/navigation";
import { FileJson, Plus } from "lucide-react";
import { HealthBadge } from "@/components/domain/badges";
import { EndpointsList } from "@/components/domain/endpoints-list";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";
import { mapEndpoint, type DbEndpoint } from "@/lib/mappers";

export const metadata = { title: "Endpoints" };

export default async function EndpointsPage() {
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase
    .from("endpoints")
    .select(
      "id, name, url, method, environment, tags, description, health, auth_type, last_checked_at, response_time, baseline_version, breaking_count, warning_count"
    )
    .eq("workspace_id", ctx.workspaceId)
    .order("created_at", { ascending: false })
    .limit(200);

  const endpoints = (data as DbEndpoint[] | null)?.map(mapEndpoint) ?? [];
  const breaking = endpoints.filter((e) => e.health === "breaking").length;
  const warning = endpoints.filter((e) => e.health === "warning").length;
  const healthy = endpoints.filter((e) => e.health === "healthy").length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border px-5 pt-4">
        <div className="flex flex-wrap items-end justify-between gap-4 pb-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Endpoints</h1>
            <p className="mt-1 text-sm text-muted">
              {endpoints.length} monitored · {breaking} breaking ·{" "}
              {ctx.workspaceName}
            </p>
          </div>
          <div className="flex gap-2">
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
          </div>
        </div>
      </div>

      <EndpointsList endpoints={endpoints} />

      <div className="flex items-center gap-3 border-t border-border px-4 py-2 text-[11px] text-muted">
        <HealthBadge status="breaking" />
        <span>{breaking}</span>
        <HealthBadge status="warning" />
        <span>{warning}</span>
        <HealthBadge status="healthy" />
        <span>{healthy}</span>
        <span className="ml-auto">{endpoints.length} total</span>
      </div>
    </div>
  );
}

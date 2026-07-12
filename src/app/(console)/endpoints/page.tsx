import Link from "next/link";
import { redirect } from "next/navigation";
import { FileJson, Plus } from "lucide-react";
import { EndpointRow } from "@/components/domain/endpoint-card";
import { HealthBadge } from "@/components/domain/badges";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";
import { mapEndpoint, type DbEndpoint } from "@/lib/mappers";
import { EndpointsToolbar } from "@/components/domain/endpoints-toolbar";

export const metadata = { title: "Endpoints" };

export default async function EndpointsPage() {
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase
    .from("endpoints")
    .select("*")
    .eq("workspace_id", ctx.workspaceId)
    .order("created_at", { ascending: false });

  const endpoints = (data as DbEndpoint[] | null)?.map(mapEndpoint) ?? [];
  const breaking = endpoints.filter((e) => e.health === "breaking").length;
  const warning = endpoints.filter((e) => e.health === "warning").length;
  const healthy = endpoints.filter((e) => e.health === "healthy").length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border px-5 py-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
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
        <EndpointsToolbar />
      </div>

      <div className="hidden border-b border-border-subtle px-4 py-2 text-[11px] uppercase tracking-wider text-muted sm:grid sm:grid-cols-[72px_1fr_120px_100px_88px] sm:gap-x-4">
        <span>Method</span>
        <span>Endpoint</span>
        <span className="text-right">Env</span>
        <span className="text-right">Latency</span>
        <span className="text-right">Checked</span>
      </div>

      <div className="flex-1 overflow-auto">
        {endpoints.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-sm text-muted">No endpoints yet.</p>
            <div className="mt-4 flex justify-center gap-2">
              <Link href="/endpoints/import">
                <Button size="sm" variant="secondary">
                  Import OpenAPI
                </Button>
              </Link>
              <Link href="/endpoints/new">
                <Button size="sm">Create endpoint</Button>
              </Link>
            </div>
          </div>
        ) : (
          endpoints.map((e) => <EndpointRow key={e.id} endpoint={e} />)
        )}
      </div>

      <div className="flex items-center gap-3 border-t border-border px-4 py-2 text-[11px] text-muted">
        <HealthBadge status="breaking" />
        <span>{breaking}</span>
        <HealthBadge status="warning" />
        <span>{warning}</span>
        <HealthBadge status="healthy" />
        <span>{healthy}</span>
        <span className="ml-auto">{endpoints.length} shown</span>
      </div>
    </div>
  );
}

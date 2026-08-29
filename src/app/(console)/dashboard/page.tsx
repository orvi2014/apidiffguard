import Link from "next/link";
import { redirect } from "next/navigation";
import {
  FileJson,
  GitCompare,
  Play,
  Plus,
  Shield,
  Webhook,
} from "lucide-react";
import {
  ActivityFeed,
  EmptyState,
  MetricStrip,
} from "@/components/domain/activity";
import { PageHeader } from "@/components/layout/page-header";
import { EndpointCard } from "@/components/domain/endpoint-card";
import { DriftAttentionCard } from "@/components/domain/drift-attention-card";
import { Button } from "@/components/ui/button";
import { canEditWorkspace } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";
import {
  countChecksToday,
  listWorkspaceEndpointsForDashboard,
} from "@/lib/workspace-data";
import { mapEndpoint, type DbEndpoint } from "@/lib/mappers";
import type { ActivityItem } from "@/lib/types";
import { formatRelativeTime, pluralize } from "@/lib/utils";

export const metadata = { title: "Overview" };

export default async function DashboardPage() {
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login");
  const canEdit = canEditWorkspace(ctx.role);

  const supabase = await createClient();

  const endpointRows = await listWorkspaceEndpointsForDashboard(ctx.workspaceId);
  const endpoints = (endpointRows as DbEndpoint[]).map(mapEndpoint);

  const [{ data: activityRows }, { data: latestDiff }, checksToday] =
    await Promise.all([
      supabase
        .from("activities")
        .select("id, type, title, description, created_at, metadata")
        .eq("workspace_id", ctx.workspaceId)
        .order("created_at", { ascending: false })
        .limit(12),
      supabase
        .from("diffs")
        .select(
          "id, breaking_count, warning_count, created_at, endpoint_id, endpoints!inner(name, baseline_version, workspace_id)"
        )
        .eq("endpoints.workspace_id", ctx.workspaceId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      countChecksToday(ctx.workspaceId),
    ]);
  const drifting = endpoints.filter(
    (e) => e.health === "breaking" || e.health === "warning"
  );
  // Every drifting endpoint used to appear twice — once under "Needs attention"
  // and again in the "Endpoints" list directly below it. On a small workspace
  // the page simply repeated itself. Each row now has exactly one home.
  const steady = endpoints.filter(
    (e) => e.health !== "breaking" && e.health !== "warning"
  );
  const healthy = endpoints.filter((e) => e.health === "healthy").length;
  const breaking = endpoints.filter((e) => e.health === "breaking").length;
  const warnings = endpoints.filter((e) => e.health === "warning").length;
  const lastChecked = endpoints.find((e) => e.lastCheckedAt)?.lastCheckedAt;

  const activities: ActivityItem[] =
    activityRows?.map((a) => ({
      id: a.id,
      type: a.type as ActivityItem["type"],
      title: a.title,
      description: a.description ?? undefined,
      createdAt: a.created_at,
      href:
        a.metadata &&
        typeof a.metadata === "object" &&
        "diffId" in a.metadata &&
        typeof (a.metadata as { diffId?: string }).diffId === "string"
          ? `/diff/${(a.metadata as { diffId: string }).diffId}`
          : undefined,
    })) ?? [];

  const endpointRel = latestDiff?.endpoints;
  const endpointName = Array.isArray(endpointRel)
    ? endpointRel[0]?.name
    : endpointRel && typeof endpointRel === "object" && "name" in endpointRel
      ? String((endpointRel as { name: string }).name)
      : "Endpoint";
  const baselineVersion = Array.isArray(endpointRel)
    ? endpointRel[0]?.baseline_version
    : endpointRel &&
        typeof endpointRel === "object" &&
        "baseline_version" in endpointRel
      ? (endpointRel as { baseline_version: number | null }).baseline_version
      : null;

  const primaryEndpoint = endpoints[0];

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <div className="min-w-0 flex-1">
        <PageHeader
          title="Overview"
          description={
            <>
              {ctx.workspaceName}
              {lastChecked
                ? ` · last check ${formatRelativeTime(lastChecked)}`
                : " · no checks yet"}
            </>
          }
          actions={
            /* On a first-run workspace the empty state below states the same
               two actions. Offering them twice in one viewport is the same
               defect this page already had between its two list sections. */
            endpoints.length === 0 ? undefined : (
              <>
                {canEdit ? (
                  <>
                    <Link href="/endpoints/new">
                      <Button size="sm" variant="secondary" className="gap-1.5">
                        <Plus className="size-3.5" />
                        Endpoint
                      </Button>
                    </Link>
                    <Link href="/endpoints/import">
                      <Button size="sm" variant="secondary" className="gap-1.5">
                        <FileJson className="size-3.5" />
                        Import OpenAPI
                      </Button>
                    </Link>
                  </>
                ) : null}
                {primaryEndpoint ? (
                  <Link href={`/endpoints/${primaryEndpoint.id}`}>
                    <Button size="sm" className="gap-1.5">
                      <Play className="size-3.5" />
                      Open endpoint
                    </Button>
                  </Link>
                ) : null}
              </>
            )
          }
        />

        {/* Counts of nothing are not a measurement. Before the first endpoint
            exists the strip would read 0 · 0 · 0 · 0 across the widest band on
            the page. */}
        {endpoints.length > 0 ? (
          <MetricStrip
            items={[
              { label: "Healthy", value: healthy, tone: "text-success" },
              { label: "Breaking", value: breaking, tone: "text-danger" },
              { label: "Warnings", value: warnings, tone: "text-warning" },
              {
                label: "Checks today",
                value: checksToday ?? 0,
                tone: "text-foreground",
              },
            ]}
          />
        ) : null}

        {endpoints.length === 0 ? (
          /* A first-run workspace used to get three grey sentences spread over
             two empty sections. There is exactly one thing to do here. */
          <EmptyState
            icon={<Webhook className="size-4" />}
            title="Nothing is being watched yet"
            description={
              canEdit
                ? "Add the endpoint you care about, capture its response as a baseline, and APIDiffGuard tells you the moment the contract changes."
                : "No endpoints have been added to this workspace yet. Ask an editor to add one."
            }
            action={
              canEdit ? (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button asChild size="sm">
                    <Link href="/endpoints/new">Add an endpoint</Link>
                  </Button>
                  <Button asChild size="sm" variant="secondary">
                    <Link href="/endpoints/import">Import an OpenAPI spec</Link>
                  </Button>
                </div>
              ) : undefined
            }
          />
        ) : (
          <>
            <section className="border-b border-border px-5 py-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium">Needs attention</h2>
                {latestDiff ? (
                  <Link
                    href={`/diff/${latestDiff.id}`}
                    className="text-xs text-accent hover:underline"
                  >
                    Open latest diff
                  </Link>
                ) : null}
              </div>

              {latestDiff &&
              (latestDiff.breaking_count > 0 ||
                latestDiff.warning_count > 0) ? (
                <DriftAttentionCard
                  href={`/diff/${latestDiff.id}`}
                  endpointName={endpointName}
                  breakingCount={latestDiff.breaking_count}
                  warningCount={latestDiff.warning_count}
                  baselineVersion={baselineVersion}
                  createdAt={latestDiff.created_at}
                />
              ) : null}

              {drifting.length > 0 ? (
                <div className="mt-3 divide-y divide-border-subtle border-y border-border-subtle">
                  {drifting.map((e) => (
                    <EndpointCard key={e.id} endpoint={e} />
                  ))}
                </div>
              ) : (
                /* Matching the baseline is a result, not an absence. It gets
                   the success voice rather than the same grey as "no data". */
                <p className="mt-4 flex items-center gap-2 text-sm text-muted">
                  <span className="size-1.5 shrink-0 rounded-full bg-success" />
                  {lastChecked
                    ? `All ${pluralize(endpoints.length, "endpoint")} match their baselines.`
                    : `No checks have run yet. Capture a baseline to start watching for drift.`}
                </p>
              )}
            </section>

            {steady.length > 0 ? (
              <section className="px-5 py-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium">
                    {drifting.length > 0 ? "Everything else" : "Monitored"}
                  </h2>
                  <Link
                    href="/endpoints"
                    className="text-xs text-muted hover:text-foreground"
                  >
                    View all
                  </Link>
                </div>
                <div className="mt-3 divide-y divide-border-subtle border-y border-border-subtle">
                  {steady.slice(0, 5).map((e) => (
                    <EndpointCard key={e.id} endpoint={e} />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>

      <aside className="w-full shrink-0 border-t border-border lg:w-80 lg:border-l lg:border-t-0">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
            Activity
          </h2>
        </div>
        <div className="px-3">
          {activities.length === 0 ? (
            <p className="px-1 py-4 text-sm text-muted">No activity yet.</p>
          ) : (
            <ActivityFeed items={activities} />
          )}
        </div>
        <div className="border-t border-border px-4 py-4">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
            Quick actions
          </h2>
          <div className="mt-3 space-y-1">
            {[
              /* "Open endpoint to capture" and "Open endpoint to check" were
                 two rows pointing at the identical href — one destination
                 wearing two labels. Every row here now goes somewhere else. */
              primaryEndpoint
                ? {
                    href: `/endpoints/${primaryEndpoint.id}`,
                    label: `Open ${primaryEndpoint.name}`,
                    icon: Play,
                  }
                : {
                    href: canEdit ? "/endpoints/new" : "/endpoints",
                    label: canEdit ? "Add an endpoint" : "Browse endpoints",
                    icon: Plus,
                  },
              { href: "/diffs", label: "Review recent diffs", icon: GitCompare },
              {
                href: "/alerts/channels",
                label: "Configure alert channels",
                icon: Shield,
              },
              ...(canEdit
                ? [
                    {
                      href: "/endpoints/import",
                      label: "Import OpenAPI",
                      icon: FileJson,
                    },
                  ]
                : []),
            ].map((a) => (
              <Link
                key={a.label}
                href={a.href}
                className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted transition-colors hover:bg-surface hover:text-foreground cursor-pointer"
              >
                <a.icon className="size-3.5" />
                {a.label}
              </Link>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

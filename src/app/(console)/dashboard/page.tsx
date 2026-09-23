import Link from "next/link";
import { redirect } from "next/navigation";
import { FileJson, Plus, Webhook } from "lucide-react";
import {
  ActivityFeed,
  EmptyState,
  MetricStrip,
} from "@/components/domain/activity";
import { PageHeader } from "@/components/layout/page-header";
import { EndpointCard } from "@/components/domain/endpoint-card";
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
        .select("id, endpoints!inner(workspace_id)")
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
  // Endpoints arrive ordered by last edit, not last check, so the first one
  // with a timestamp was not necessarily the most recent check.
  const lastChecked = endpoints.reduce<string | undefined>(
    (latest, e) =>
      e.lastCheckedAt && (!latest || e.lastCheckedAt > latest)
        ? e.lastCheckedAt
        : latest,
    undefined
  );

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
               defect this page already had between its two list sections.
               "Open endpoint" used to sit here too, pointing at whichever
               endpoint was edited last — a primary action with no subject. */
            endpoints.length === 0 || !canEdit ? undefined : (
              <>
                <Button asChild size="sm" variant="secondary" className="gap-1.5">
                  <Link href="/endpoints/new">
                    <Plus className="size-3.5" aria-hidden />
                    Endpoint
                  </Link>
                </Button>
                <Button asChild size="sm" variant="secondary" className="gap-1.5">
                  <Link href="/endpoints/import">
                    <FileJson className="size-3.5" aria-hidden />
                    Import OpenAPI
                  </Link>
                </Button>
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
              /* A status colour is a reading. "0" in red announces a break
                 that does not exist, so a count only takes its colour when
                 there is something to count. */
              {
                label: "Healthy",
                value: healthy,
                tone: healthy > 0 ? "text-success" : "text-muted",
              },
              {
                label: "Breaking",
                value: breaking,
                tone: breaking > 0 ? "text-danger" : "text-muted",
              },
              {
                label: "Warnings",
                value: warnings,
                tone: warnings > 0 ? "text-warning" : "text-muted",
              },
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

              {/* The latest diff used to get its own animated card here, naming
                  an endpoint that the list below repeated with the same counts.
                  The list carries the counts; the link above opens the diff. */}
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
        {/* "Quick actions" repeated the header buttons and the console nav —
            Diffs, Alerts, Import — as a third copy of the same destinations. */}
      </aside>
    </div>
  );
}

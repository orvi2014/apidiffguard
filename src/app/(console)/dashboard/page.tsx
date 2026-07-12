import Link from "next/link";
import { redirect } from "next/navigation";
import {
  FileJson,
  Play,
  Plus,
  Shield,
} from "lucide-react";
import { ActivityFeed, MetricStrip } from "@/components/domain/activity";
import { EndpointCard } from "@/components/domain/endpoint-card";
import { DriftAttentionCard } from "@/components/domain/drift-attention-card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";
import { mapEndpoint, type DbEndpoint } from "@/lib/mappers";
import type { ActivityItem } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";

export const metadata = { title: "Overview" };

export default async function DashboardPage() {
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login");

  const supabase = await createClient();

  const { data: endpointRows } = await supabase
    .from("endpoints")
    .select(
      "id, name, url, method, environment, tags, description, health, auth_type, last_checked_at, response_time, baseline_version, breaking_count, warning_count"
    )
    .eq("workspace_id", ctx.workspaceId)
    .order("updated_at", { ascending: false })
    .limit(50);

  const endpoints = (endpointRows as DbEndpoint[] | null)?.map(mapEndpoint) ?? [];
  const endpointIds = endpoints.map((e) => e.id);
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const [{ data: activityRows }, { data: latestDiff }, { count: checksToday }] =
    await Promise.all([
      supabase
        .from("activities")
        .select("id, type, title, description, created_at, metadata")
        .eq("workspace_id", ctx.workspaceId)
        .order("created_at", { ascending: false })
        .limit(12),
      endpointIds.length
        ? supabase
            .from("diffs")
            .select(
              "id, breaking_count, warning_count, created_at, endpoint_id, endpoints(name, baseline_version)"
            )
            .in("endpoint_id", endpointIds)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      endpointIds.length
        ? supabase
            .from("checks")
            .select("id", { count: "exact", head: true })
            .in("endpoint_id", endpointIds)
            .gte("started_at", dayStart.toISOString())
        : Promise.resolve({ count: 0 }),
    ]);
  const drifting = endpoints.filter(
    (e) => e.health === "breaking" || e.health === "warning"
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
        <div className="border-b border-border px-5 py-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
              <p className="mt-1 text-sm text-muted">
                {ctx.workspaceName}
                {lastChecked
                  ? ` · last check ${formatRelativeTime(lastChecked)}`
                  : " · no checks yet"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
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
              {primaryEndpoint ? (
                <Link href={`/endpoints/${primaryEndpoint.id}`}>
                  <Button size="sm" className="gap-1.5">
                    <Play className="size-3.5" />
                    Run check
                  </Button>
                </Link>
              ) : null}
            </div>
          </div>
        </div>

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

          {latestDiff && (latestDiff.breaking_count > 0 || latestDiff.warning_count > 0) ? (
            <DriftAttentionCard
              href={`/diff/${latestDiff.id}`}
              endpointName={endpointName}
              breakingCount={latestDiff.breaking_count}
              warningCount={latestDiff.warning_count}
              baselineVersion={baselineVersion}
              createdAt={latestDiff.created_at}
            />
          ) : (
            <p className="mt-4 text-sm text-muted">
              No drift detected yet. Capture a baseline and run a check.
            </p>
          )}

          {drifting.length > 0 ? (
            <div className="mt-3 divide-y divide-border-subtle border-y border-border-subtle">
              {drifting.map((e) => (
                <EndpointCard key={e.id} endpoint={e} />
              ))}
            </div>
          ) : null}
        </section>

        <section className="px-5 py-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Endpoints</h2>
            <Link
              href="/endpoints"
              className="text-xs text-muted hover:text-foreground"
            >
              View all
            </Link>
          </div>
          {endpoints.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              No endpoints yet.{" "}
              <Link href="/endpoints/import" className="text-accent hover:underline">
                Import OpenAPI
              </Link>{" "}
              or create one.
            </p>
          ) : (
            <div className="mt-3 divide-y divide-border-subtle border-y border-border-subtle">
              {endpoints.slice(0, 5).map((e) => (
                <EndpointCard key={e.id} endpoint={e} />
              ))}
            </div>
          )}
        </section>
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
              {
                href: primaryEndpoint
                  ? `/endpoints/${primaryEndpoint.id}`
                  : "/endpoints/new",
                label: "Capture baseline",
                icon: Shield,
              },
              {
                href: primaryEndpoint
                  ? `/endpoints/${primaryEndpoint.id}`
                  : "/endpoints/new",
                label: "Run check",
                icon: Play,
              },
              { href: "/endpoints/new", label: "Create endpoint", icon: Plus },
              {
                href: "/endpoints/import",
                label: "Import OpenAPI",
                icon: FileJson,
              },
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

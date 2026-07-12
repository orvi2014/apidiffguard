"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GitCompare,
  History,
  Loader2,
  Play,
  Shield,
  Trash2,
} from "lucide-react";
import { HealthBadge, MethodBadge, SeverityBadge } from "@/components/domain/badges";
import { Timeline } from "@/components/domain/activity";
import { Button } from "@/components/ui/button";
import type { Baseline, Endpoint } from "@/lib/types";
import { cn, formatBytes, formatMs, formatRelativeTime } from "@/lib/utils";
import {
  captureBaselineAction,
  deleteEndpoint,
  runCheckAction,
} from "@/app/actions/endpoints";

export function EndpointDetailLive({
  endpoint,
  baselines,
  latestDiffId,
}: {
  endpoint: Endpoint;
  baselines: Baseline[];
  latestDiffId?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<"baseline" | "check" | "delete" | null>(
    null
  );
  const [message, setMessage] = React.useState<{
    tone: "ok" | "warn" | "err";
    text: string;
  } | null>(null);
  const [local, setLocal] = React.useState(endpoint);

  React.useEffect(() => {
    setLocal(endpoint);
  }, [endpoint]);

  const onCapture = async () => {
    setBusy("baseline");
    setMessage(null);
    const result = await captureBaselineAction(local.id);
    setBusy(null);
    if (result.error) {
      setMessage({ tone: "err", text: result.error });
      return;
    }
    setMessage({
      tone: "ok",
      text: `Baseline v${result.version} captured · HTTP ${result.statusCode} · ${formatMs(result.responseTime!)}`,
    });
    router.refresh();
  };

  const onCheck = async () => {
    setBusy("check");
    setMessage(null);
    const result = await runCheckAction(local.id);
    setBusy(null);
    if (result.error) {
      setMessage({
        tone: result.error.includes("baseline") ? "warn" : "err",
        text: result.error,
      });
      return;
    }
    if (result.changeCount === 0) {
      setMessage({
        tone: "ok",
        text: "Check passed · no drift vs active baseline",
      });
      router.refresh();
      return;
    }
    setMessage({
      tone: result.breakingCount ? "err" : "warn",
      text: `Found ${result.breakingCount} breaking · ${result.warningCount} warnings`,
    });
    if (result.diffId) router.push(`/diff/${result.diffId}`);
    else router.refresh();
  };

  const onDelete = async () => {
    if (!confirm("Delete this endpoint?")) return;
    setBusy("delete");
    await deleteEndpoint(local.id);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col xl:flex-row">
      <div className="min-w-0 flex-1">
        <div className="border-b border-border px-5 py-5">
          <div className="flex items-center gap-2 text-xs text-muted">
            <Link href="/endpoints" className="hover:text-foreground">
              Endpoints
            </Link>
            <span>/</span>
            <span className="text-foreground">{local.name}</span>
          </div>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <MethodBadge method={local.method} />
                <h1 className="text-xl font-semibold tracking-tight">
                  {local.name}
                </h1>
                <HealthBadge status={local.health} />
              </div>
              <p className="mt-2 font-mono text-xs text-muted">{local.url}</p>
              {local.description ? (
                <p className="mt-2 max-w-xl text-sm text-muted">
                  {local.description}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                className="gap-1.5"
                disabled={busy !== null}
                onClick={() => void onCapture()}
              >
                {busy === "baseline" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Shield className="size-3.5" />
                )}
                Capture baseline
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
                disabled={busy !== null}
                onClick={() => void onCheck()}
              >
                {busy === "check" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Play className="size-3.5" />
                )}
                Run check
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-danger"
                disabled={busy !== null}
                onClick={() => void onDelete()}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>

          {message ? (
            <div
              className={cn(
                "mt-4 rounded-md border px-3 py-2 text-xs",
                message.tone === "ok" &&
                  "border-success/30 bg-success-muted text-success",
                message.tone === "warn" &&
                  "border-warning/30 bg-warning-muted text-warning",
                message.tone === "err" &&
                  "border-danger/30 bg-danger-muted text-danger"
              )}
            >
              {message.text}
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted">
            <span>
              Env <span className="text-foreground">{local.environment}</span>
            </span>
            <span>
              Auth{" "}
              <span className="font-mono text-foreground">{local.authType}</span>
            </span>
            <span>
              Baseline{" "}
              <span className="text-foreground">
                v{local.baselineVersion ?? "—"}
              </span>
            </span>
            <span>
              Latency{" "}
              <span className="font-mono text-foreground">
                {local.responseTime != null ? formatMs(local.responseTime) : "—"}
              </span>
            </span>
          </div>
        </div>

        {(local.breakingCount || local.warningCount) && latestDiffId ? (
          <section className="border-b border-border px-5 py-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">Latest drift</h2>
              <Link
                href={`/diff/${latestDiffId}`}
                className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline"
              >
                <GitCompare className="size-3.5" />
                Open diff
              </Link>
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              {local.breakingCount ? (
                <SeverityBadge severity="breaking" />
              ) : null}
              {local.warningCount ? (
                <SeverityBadge severity="warning" />
              ) : null}
            </div>
          </section>
        ) : null}

        <section className="px-5 py-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-medium">
              <History className="size-3.5 text-muted" />
              Baseline history
            </h2>
            <Link
              href={`/endpoints/${local.id}/baselines`}
              className="text-xs text-muted hover:text-foreground"
            >
              View all
            </Link>
          </div>
          {baselines.length === 0 ? (
            <div className="mt-3 border-y border-border-subtle py-8 text-center text-sm text-muted">
              No baselines yet. Capture one to start monitoring drift.
            </div>
          ) : (
            <div className="mt-3 divide-y divide-border-subtle border-y border-border-subtle">
              {baselines.map((b) => (
                <div
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">v{b.version}</span>
                      {b.isActive ? (
                        <span className="rounded bg-accent-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
                          Active
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      {b.statusCode} · {formatMs(b.responseTime)} ·{" "}
                      {formatBytes(b.contentSize)}
                    </p>
                  </div>
                  <time className="text-[11px] text-muted-foreground">
                    {formatRelativeTime(b.createdAt)}
                  </time>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <aside className="w-full shrink-0 border-t border-border xl:w-72 xl:border-l xl:border-t-0">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
            Timeline
          </h2>
        </div>
        <div className="px-4 py-2">
          <Timeline
            items={[
              {
                id: "1",
                title: local.lastCheckedAt ? "Last check" : "Not checked yet",
                meta: local.lastCheckedAt
                  ? `${local.health} · ${local.breakingCount ?? 0} breaking`
                  : "Capture a baseline to begin",
                at: local.lastCheckedAt ?? new Date().toISOString(),
                tone:
                  local.health === "breaking"
                    ? "danger"
                    : local.health === "warning"
                      ? "warning"
                      : local.health === "healthy"
                        ? "success"
                        : "default",
              },
              ...(baselines[0]
                ? [
                    {
                      id: "2",
                      title: "Baseline active",
                      meta: `v${baselines[0].version}`,
                      at: baselines[0].createdAt,
                      tone: "default" as const,
                    },
                  ]
                : []),
            ]}
          />
        </div>
      </aside>
    </div>
  );
}

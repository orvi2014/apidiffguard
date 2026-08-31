"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GitCompare,
  History,
  Loader2,
  Pencil,
  Play,
  Shield,
  Trash2,
} from "lucide-react";
import { HealthBadge, MethodBadge, SeverityBadge } from "@/components/domain/badges";
import { Timeline } from "@/components/domain/activity";
import { EndpointEditForm } from "@/components/domain/endpoint-edit-form";
import { IgnoreRulesPanel } from "@/components/domain/ignore-rules-panel";
import { ContractSchemaPanel } from "@/components/domain/contract-schema-panel";
import { Button } from "@/components/ui/button";
import type { Baseline, Endpoint } from "@/lib/types";
import { cn, formatBytes, formatMs, formatRelativeTime, pluralize } from "@/lib/utils";
import {
  captureBaselineAction,
  deleteEndpoint,
  runCheckAction,
} from "@/app/actions/endpoints";

/**
 * How long to hold on the verdict before navigating to the diff.
 *
 * Read at call time rather than through a hook: it is consulted once per check,
 * and a user who turns motion down mid-session should get the shorter path on
 * their next check without a re-render.
 */
function verdictHold(): number {
  if (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  ) {
    return 0;
  }
  return 460;
}

export function EndpointDetailLive({
  endpoint,
  baselines,
  latestDiffId,
  requestBody = "",
  contentType = "application/json",
  canEdit = true,
  ignoreRules = [],
  responseSchema = null,
}: {
  endpoint: Endpoint;
  baselines: Baseline[];
  latestDiffId?: string | null;
  requestBody?: string;
  contentType?: string;
  canEdit?: boolean;
  ignoreRules?: Array<{ id: string; path: string; reason: string | null }>;
  responseSchema?: Record<string, unknown> | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<"baseline" | "check" | "delete" | null>(
    null
  );
  const [editing, setEditing] = React.useState(false);
  const [message, setMessage] = React.useState<{
    tone: "ok" | "warn" | "err";
    text: string;
  } | null>(null);
  const [local, setLocal] = React.useState(endpoint);
  // 0 means "nothing has transitioned yet", which keeps the badge static on
  // first paint. Every increment is a verdict we watched arrive.
  const [settleKey, setSettleKey] = React.useState(0);

  // Re-sync when the server sends a newer row. Adjusting state during render
  // (React's documented pattern for derived state) re-renders immediately with
  // the right value, instead of committing a stale frame first and then
  // cascading a second render from an effect.
  const [syncedFrom, setSyncedFrom] = React.useState(endpoint);
  if (syncedFrom !== endpoint) {
    setSyncedFrom(endpoint);
    setLocal(endpoint);
  }

  const onCapture = async (allowErrorStatus = false) => {
    setBusy("baseline");
    setMessage(null);
    // Capturing a baseline fetches the endpoint too, so it is the same
    // scanning beat. This is also the first thing a new workspace ever does,
    // which makes it the worst possible moment to look inert.
    setLocal((l) => ({ ...l, health: "checking" }));
    const result = await captureBaselineAction(local.id, { allowErrorStatus });
    setBusy(null);
    // Every path out of here has to leave the scanning state, or the pill
    // sweeps forever on a request that already finished.
    const stopScanning = () =>
      setLocal((l) => ({ ...l, health: endpoint.health }));

    if (result && "needsConfirm" in result && result.needsConfirm) {
      if (
        confirm(
          `Got HTTP ${result.statusCode}. Save this error response as the baseline anyway?`
        )
      ) {
        await onCapture(true);
      } else {
        stopScanning();
        setMessage({
          tone: "warn",
          text: result.error ?? "Baseline not saved.",
        });
      }
      return;
    }
    if (result?.error) {
      stopScanning();
      setMessage({ tone: "err", text: result.error });
      return;
    }
    stopScanning();
    setMessage({
      tone: "ok",
      text: `Baseline v${result.version} captured · HTTP ${result.statusCode} · ${formatMs(result.responseTime!)}`,
    });
    router.refresh();
  };

  const onCheck = async () => {
    setBusy("check");
    setMessage(null);
    // The server sets health to CHECKING immediately, but the client would not
    // see it until a refresh — which lands after the check has already
    // finished. Entering the state locally is what makes the scanning beat
    // real; without it the pill sat unchanged for the whole request and the
    // only feedback was a 14px spinner inside the button.
    setLocal((l) => ({ ...l, health: "checking" }));

    const result = await runCheckAction(local.id);
    setBusy(null);

    if ("error" in result && result.error) {
      setLocal((l) => ({ ...l, health: endpoint.health }));
      setMessage({
        tone: result.error.includes("baseline") ? "warn" : "err",
        text: result.error,
      });
      return;
    }
    if (!("success" in result) || !result.success) {
      setLocal((l) => ({ ...l, health: endpoint.health }));
      return;
    }

    const verdict: Endpoint["health"] = result.breakingCount
      ? "breaking"
      : result.warningCount
        ? "warning"
        : "healthy";
    setLocal((l) => ({
      ...l,
      health: verdict,
      breakingCount: result.breakingCount ?? 0,
      warningCount: result.warningCount ?? 0,
    }));
    // Bumping the key remounts the badge, which restarts the CSS animation.
    // Gated on a real transition, so nothing animates on first paint.
    setSettleKey((k) => k + 1);

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
      text: `Found ${pluralize(result.breakingCount, "breaking change")} · ${pluralize(result.warningCount, "warning")}`,
    });

    if (result.diffId) {
      const diffId = result.diffId;
      // Let the verdict land before the diff replaces the page. Previously the
      // route changed the instant the promise resolved, so the endpoint you
      // were looking at never visibly turned red — you were just somewhere
      // else. After a multi-second check this beat reads as comprehension, not
      // latency, and it collapses to nothing when motion is reduced.
      window.setTimeout(() => router.push(`/diff/${diffId}`), verdictHold());
    } else {
      router.refresh();
    }
  };

  const onDelete = async () => {
    if (!confirm("Delete this endpoint?")) return;
    setBusy("delete");
    setMessage(null);
    const result = await deleteEndpoint(local.id);
    if (result?.error) {
      setMessage({ tone: "err", text: result.error });
      setBusy(null);
    }
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
                <HealthBadge
                  key={settleKey}
                  status={local.health}
                  settle={settleKey > 0}
                />
              </div>
              <p className="mt-2 font-mono text-xs text-muted">{local.url}</p>
              {local.description ? (
                <p className="mt-2 max-w-xl text-sm text-muted">
                  {local.description}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {canEdit ? (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="gap-1.5"
                    disabled={busy !== null}
                    onClick={() => setEditing((v) => !v)}
                  >
                    <Pencil className="size-3.5" />
                    {editing ? "Close edit" : "Edit"}
                  </Button>
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
                    // A check with no baseline has nothing to compare against
                    // and always fails server-side; don't offer the round trip.
                    disabled={busy !== null || baselines.length === 0}
                    title={
                      baselines.length === 0
                        ? "Capture a baseline first — a check compares against it."
                        : undefined
                    }
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
                    aria-label="Delete endpoint"
                    onClick={() => void onDelete()}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </Button>
                </>
              ) : (
                <p className="text-xs text-muted">
                  View-only — ask an editor to capture baselines or run checks.
                </p>
              )}
            </div>
          </div>

          {editing && canEdit ? (
            <EndpointEditForm
              endpoint={local}
              requestBody={requestBody}
              contentType={contentType}
              onDone={() => {
                setEditing(false);
                setMessage({ tone: "ok", text: "Endpoint updated." });
              }}
            />
          ) : null}

          {message ? (
            <div
              role={message.tone === "err" ? "alert" : "status"}
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
              Diff{" "}
              <span className="font-mono text-foreground">
                {local.diffMode ?? "schema"}
              </span>
            </span>
            <span>
              Contract{" "}
              <span className="text-foreground">
                {responseSchema ? "OpenAPI schema" : "none"}
              </span>
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

        <IgnoreRulesPanel
          endpointId={local.id}
          rules={ignoreRules}
          canEdit={canEdit}
        />

        <ContractSchemaPanel
          endpointId={local.id}
          schema={responseSchema}
          canEdit={canEdit}
        />

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
                        <span className="rounded bg-accent-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent-on-wash">
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
                at: local.lastCheckedAt ?? "",
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

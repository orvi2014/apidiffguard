import Link from "next/link";
import { redirect } from "next/navigation";
import { testAlertNotification } from "@/app/actions/alerts";
import { SeverityBadge } from "@/components/domain/badges";
import { PendingSubmitButton } from "@/components/form/pending-submit-button";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { canEditWorkspace } from "@/lib/plans";
import { getWorkspaceContext } from "@/lib/workspace";
import { cn, formatRelativeTime } from "@/lib/utils";

export const metadata = { title: "Alerts" };

const channelLabel: Record<string, string> = {
  SLACK: "Slack",
  DISCORD: "Discord",
  EMAIL: "Email",
  WEBHOOK: "Webhook",
};

const statusTone: Record<string, string> = {
  SENT: "text-success",
  FAILED: "text-danger",
  PENDING: "text-muted",
  RETRYING: "text-warning",
};

const severityRank: Record<string, number> = {
  INFO: 0,
  WARNING: 1,
  BREAKING: 2,
};

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ tested?: string; error?: string }>;
}) {
  const params = await searchParams;
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login");
  const canEdit = canEditWorkspace(ctx.role);

  const supabase = await createClient();
  const { data: configs } = await supabase
    .from("alert_configs")
    .select("id, channel, enabled, min_severity")
    .eq("workspace_id", ctx.workspaceId);

  const enabledCount = configs?.filter((c) => c.enabled).length ?? 0;
  const configIds = configs?.map((c) => c.id) ?? [];

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayStartIso = dayStart.toISOString();

  const [{ data: history }, { count: sentTodayCount }, { count: failed }] =
    await Promise.all([
      configIds.length
        ? supabase
            .from("alert_history")
            .select(
              "id, alert_config_id, status, severity, message, error, created_at"
            )
            .in("alert_config_id", configIds)
            .order("created_at", { ascending: false })
            .limit(50)
        : Promise.resolve({ data: [] as never[] }),
      configIds.length
        ? supabase
            .from("alert_history")
            .select("id", { count: "exact", head: true })
            .in("alert_config_id", configIds)
            .eq("status", "SENT")
            .gte("created_at", dayStartIso)
        : Promise.resolve({ count: 0 }),
      configIds.length
        ? supabase
            .from("alert_history")
            .select("id", { count: "exact", head: true })
            .in("alert_config_id", configIds)
            .eq("status", "FAILED")
        : Promise.resolve({ count: 0 }),
    ]);

  const minSeverity =
    configs && configs.length
      ? configs.reduce((lowest, c) => {
          const current = String(c.min_severity ?? "WARNING").toUpperCase();
          return (severityRank[current] ?? 1) < (severityRank[lowest] ?? 1)
            ? current
            : lowest;
        }, "BREAKING")
      : "—";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border px-4 py-5 sm:px-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Alerts</h1>
            <p className="mt-1 text-sm text-muted">
              Delivery history across Slack, Discord, and webhooks.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canEdit ? (
              <form action={testAlertNotification}>
                <PendingSubmitButton
                  size="sm"
                  variant="secondary"
                  disabled={enabledCount === 0}
                  className="min-h-9"
                  pendingLabel="Sending…"
                  title={
                    enabledCount === 0
                      ? "Add and enable a channel first"
                      : "Send a test to enabled channels"
                  }
                >
                  Test notification
                </PendingSubmitButton>
              </form>
            ) : null}
            <Button asChild size="sm" className="min-h-9">
              <Link href="/alerts/channels">Configure channels</Link>
            </Button>
          </div>
        </div>
        {enabledCount === 0 ? (
          <p className="mt-2 text-xs text-muted">
            Add and enable a channel before sending a test notification.
          </p>
        ) : null}

        {params.tested ? (
          <p
            role="status"
            className="mt-4 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm animate-in fade-in slide-in-from-top-1 duration-300"
          >
            Test notification sent and recorded in history.
          </p>
        ) : null}
        {params.error ? (
          <p
            role="alert"
            className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm animate-in fade-in slide-in-from-top-1 duration-300"
          >
            {params.error === "delivery-failed"
              ? "Delivery failed. Check the channel destination and try again."
              : params.error === "forbidden"
                ? "Viewers cannot send test notifications."
                : params.error === "partial"
                  ? "Some channels succeeded; others failed. Check history below."
                  : "Could not send test notification."}
          </p>
        ) : null}

        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Channels", value: String(configs?.length ?? 0) },
            { label: "Sent today", value: String(sentTodayCount ?? 0) },
            {
              label: "Failed (all time)",
              value: String(failed ?? 0),
              tone: failed ? "text-danger" : undefined,
            },
            {
              label: "Min severity",
              value:
                minSeverity === "—"
                  ? "—"
                  : minSeverity.charAt(0) + minSeverity.slice(1).toLowerCase(),
            },
          ].map((s) => (
            <div key={s.label}>
              <div
                className={cn(
                  "font-mono text-xl font-semibold tabular-nums",
                  s.tone
                )}
              >
                {s.value}
              </div>
              <div className="mt-0.5 text-[11px] uppercase tracking-wider text-muted">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="hidden border-b border-border-subtle px-5 py-2 text-[11px] uppercase tracking-wider text-muted sm:grid sm:grid-cols-[100px_90px_1fr_100px_80px] sm:gap-4">
        <span>Channel</span>
        <span>Severity</span>
        <span>Message</span>
        <span>Status</span>
        <span className="text-right">When</span>
      </div>

      <div className="flex-1 overflow-auto">
        {!history?.length ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-muted">
              No alerts yet. Configure channels when you&apos;re ready to notify
              on drift.
            </p>
            <Button asChild size="sm" className="mt-4 min-h-9">
              <Link href="/alerts/channels">Configure channels</Link>
            </Button>
          </div>
        ) : (
          history.map((alert) => {
            const config = configs?.find((c) => c.id === alert.alert_config_id);
            const channel = config?.channel ?? "WEBHOOK";
            return (
              <div
                key={alert.id}
                className="grid grid-cols-1 gap-1 border-b border-border-subtle px-4 py-3 transition-colors hover:bg-surface/40 sm:grid-cols-[100px_90px_1fr_100px_80px] sm:items-center sm:gap-4 sm:px-5"
              >
                <span className="text-xs font-medium">
                  {channelLabel[channel] ?? channel}
                </span>
                <SeverityBadge
                  severity={
                    (alert.severity as string)?.toLowerCase() as
                      | "breaking"
                      | "warning"
                      | "info"
                  }
                />
                <div className="min-w-0">
                  <p className="truncate text-sm">{alert.message}</p>
                  {alert.status === "FAILED" && alert.error ? (
                    <p className="mt-0.5 truncate text-xs text-danger">
                      {alert.error}
                    </p>
                  ) : null}
                </div>
                <span
                  className={cn(
                    "text-xs capitalize",
                    statusTone[alert.status] ?? "text-muted"
                  )}
                >
                  {String(alert.status).toLowerCase()}
                </span>
                <time className="text-right text-[11px] text-muted-foreground">
                  {formatRelativeTime(alert.created_at)}
                </time>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

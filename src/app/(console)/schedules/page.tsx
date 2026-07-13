import Link from "next/link";
import { redirect } from "next/navigation";
import { deleteSchedule, toggleSchedule } from "@/app/actions/schedules";
import { PendingSubmitButton } from "@/components/form/pending-submit-button";
import { AddScheduleForm } from "@/components/schedules/add-schedule-form";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";
import { listWorkspaceEndpointsForPalette } from "@/lib/workspace-data";
import { cn, formatRelativeTime } from "@/lib/utils";

export const metadata = { title: "Schedules" };

export default async function SchedulesPage({
  searchParams,
}: {
  searchParams: Promise<{
    created?: string;
    deleted?: string;
    error?: string;
  }>;
}) {
  const params = await searchParams;
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const [{ data: schedules }, endpoints] = await Promise.all([
    supabase
      .from("schedules")
      .select(
        "id, frequency, enabled, last_run_at, next_run_at, endpoint_id, endpoints(id, name)"
      )
      .eq("workspace_id", ctx.workspaceId)
      .order("created_at", { ascending: false }),
    listWorkspaceEndpointsForPalette(ctx.workspaceId),
  ]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border px-5 py-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Schedules</h1>
            <p className="mt-1 text-sm text-muted">
              Recurring checks for your monitored endpoints.
            </p>
          </div>
          <Button asChild size="sm" className="min-h-9">
            <a href="#add-schedule">Add schedule</a>
          </Button>
        </div>

        {params.created ? (
          <p
            role="status"
            className="mt-4 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm animate-in fade-in slide-in-from-top-1 duration-300"
          >
            Schedule created. Next run is queued.
          </p>
        ) : null}
        {params.deleted ? (
          <p
            role="status"
            className="mt-4 rounded-md border border-border bg-surface px-3 py-2 text-sm animate-in fade-in slide-in-from-top-1 duration-300"
          >
            Schedule removed.
          </p>
        ) : null}
        {params.error ? (
          <p
            role="alert"
            className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm animate-in fade-in slide-in-from-top-1 duration-300"
          >
            {params.error === "invalid"
              ? "Choose an endpoint and frequency."
              : "Could not save schedule. Try again."}
          </p>
        ) : null}

        <section
          id="add-schedule"
          aria-labelledby="add-schedule-heading"
          className="mt-5 scroll-mt-4 border border-border bg-surface p-4 sm:p-5"
        >
          <h2 id="add-schedule-heading" className="text-sm font-medium">
            Add schedule
          </h2>
          <AddScheduleForm
            endpoints={(endpoints ?? []).map((e) => ({
              id: e.id,
              name: e.name,
            }))}
          />
        </section>
      </div>

      <div className="hidden border-b border-border-subtle px-5 py-2 text-[11px] uppercase tracking-wider text-muted sm:grid sm:grid-cols-[1fr_100px_80px_120px_120px_140px] sm:gap-4">
        <span>Endpoint</span>
        <span>Frequency</span>
        <span>Status</span>
        <span>Last run</span>
        <span>Next run</span>
        <span className="text-right">Actions</span>
      </div>

      <div className="flex-1 overflow-auto">
        {!schedules?.length ? (
          <p className="px-5 py-12 text-center text-sm text-muted">
            {endpoints?.length
              ? "No schedules yet. Add one above to queue recurring checks."
              : "No schedules yet. Create an endpoint first, then schedule checks here."}
          </p>
        ) : (
          schedules.map((s) => {
            const ep = Array.isArray(s.endpoints) ? s.endpoints[0] : s.endpoints;
            return (
              <div
                key={s.id}
                className="grid grid-cols-1 gap-2 border-b border-border-subtle px-5 py-3.5 transition-colors hover:bg-surface/40 sm:grid-cols-[1fr_100px_80px_120px_120px_140px] sm:items-center sm:gap-4"
              >
                <Link
                  href={`/endpoints/${ep?.id ?? s.endpoint_id}`}
                  className="cursor-pointer text-sm font-medium hover:text-accent"
                >
                  {ep?.name ?? "Endpoint"}
                </Link>
                <span className="text-xs capitalize text-muted">
                  {String(s.frequency).toLowerCase()}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 text-xs",
                    s.enabled ? "text-success" : "text-muted"
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      s.enabled ? "bg-success" : "bg-muted-foreground"
                    )}
                  />
                  {s.enabled ? "On" : "Off"}
                </span>
                <span className="text-xs text-muted">
                  {s.last_run_at ? formatRelativeTime(s.last_run_at) : "—"}
                </span>
                <span className="text-xs text-muted">
                  {s.enabled && s.next_run_at
                    ? formatRelativeTime(s.next_run_at)
                    : "—"}
                </span>
                <div className="flex flex-wrap justify-start gap-2 sm:justify-end">
                  <form action={toggleSchedule}>
                    <input type="hidden" name="id" value={s.id} />
                    <input
                      type="hidden"
                      name="enabled"
                      value={s.enabled ? "true" : "false"}
                    />
                    <input type="hidden" name="frequency" value={s.frequency} />
                    <PendingSubmitButton
                      size="sm"
                      variant="secondary"
                      pendingLabel={s.enabled ? "Pausing…" : "Enabling…"}
                    >
                      {s.enabled ? "Pause" : "Enable"}
                    </PendingSubmitButton>
                  </form>
                  <form action={deleteSchedule}>
                    <input type="hidden" name="id" value={s.id} />
                    <PendingSubmitButton
                      size="sm"
                      variant="ghost"
                      pendingLabel="Removing…"
                    >
                      Remove
                    </PendingSubmitButton>
                  </form>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

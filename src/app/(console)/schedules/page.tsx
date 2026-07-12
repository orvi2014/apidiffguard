import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";
import { cn, formatRelativeTime } from "@/lib/utils";

export const metadata = { title: "Schedules" };

export default async function SchedulesPage() {
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const { data: schedules } = await supabase
    .from("schedules")
    .select("*, endpoints(id, name)")
    .eq("workspace_id", ctx.workspaceId)
    .order("created_at", { ascending: false });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border px-5 py-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Schedules</h1>
            <p className="mt-1 text-sm text-muted">
              Recurring checks with retry and backoff.
            </p>
          </div>
          <Button size="sm" disabled>
            Add schedule
          </Button>
        </div>
      </div>

      <div className="hidden border-b border-border-subtle px-5 py-2 text-[11px] uppercase tracking-wider text-muted sm:grid sm:grid-cols-[1fr_100px_80px_120px_120px] sm:gap-4">
        <span>Endpoint</span>
        <span>Frequency</span>
        <span>Status</span>
        <span>Last run</span>
        <span>Next run</span>
      </div>

      <div className="flex-1 overflow-auto">
        {!schedules?.length ? (
          <p className="px-5 py-12 text-center text-sm text-muted">
            No schedules yet. Scheduled checks will land here once Trigger.dev
            is wired.
          </p>
        ) : (
          schedules.map((s) => {
            const ep = Array.isArray(s.endpoints) ? s.endpoints[0] : s.endpoints;
            return (
              <div
                key={s.id}
                className="grid grid-cols-1 gap-1 border-b border-border-subtle px-5 py-3.5 sm:grid-cols-[1fr_100px_80px_120px_120px] sm:items-center sm:gap-4"
              >
                <Link
                  href={`/endpoints/${ep?.id ?? s.endpoint_id}`}
                  className="text-sm font-medium hover:text-accent cursor-pointer"
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
                  {s.next_run_at ? formatRelativeTime(s.next_run_at) : "—"}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

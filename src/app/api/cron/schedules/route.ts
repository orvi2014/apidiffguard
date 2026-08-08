import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { runEndpointCheck } from "@/lib/run-endpoint-check";
import { nextRunAt, retryRunAt } from "@/lib/schedule-cadence";
import { normalizePlan, planAllowsSchedules } from "@/lib/plans";
import { authorizeCron } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const startedAt = new Date();
  const now = startedAt.toISOString();

  // Claim due rows atomically. `claim_due_schedules` pushes next_run_at forward
  // under `for update skip locked` before returning, so two overlapping cron
  // ticks (the GitHub Action fires every 5 min while maxDuration is 60s) can
  // never pick up the same schedule.
  const { data: due, error } = await supabase.rpc("claim_due_schedules", {
    batch_size: 25,
    lease_seconds: 300,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type ClaimedSchedule = {
    id: string;
    workspace_id: string;
    endpoint_id: string;
    frequency: string;
    due_at: string | null;
    consecutive_failures: number | null;
    plan: string | null;
  };

  const results: Array<{
    scheduleId: string;
    ok: boolean;
    error?: string;
    diffId?: string;
    skipped?: string;
  }> = [];

  for (const schedule of (due ?? []) as ClaimedSchedule[]) {
    // A workspace downgraded to Free after its schedules were created must stop
    // running them — the create-time guard alone doesn't cover downgrades.
    if (!planAllowsSchedules(normalizePlan(schedule.plan))) {
      await supabase
        .from("schedules")
        .update({ enabled: false })
        .eq("id", schedule.id);

      results.push({
        scheduleId: schedule.id,
        ok: false,
        skipped: "plan-downgraded",
      });
      continue;
    }

    const check = await runEndpointCheck(supabase, {
      endpointId: schedule.endpoint_id,
      workspaceId: schedule.workspace_id,
    });

    if ("error" in check) {
      const failures = (schedule.consecutive_failures ?? 0) + 1;
      const retry = retryRunAt(failures, startedAt);

      await supabase
        .from("schedules")
        .update({
          last_run_at: now,
          consecutive_failures: failures,
          // Exhausted the retry budget — pause instead of requeueing forever
          // and writing an activity row every 15 minutes.
          ...(retry ? { next_run_at: retry } : { enabled: false }),
        })
        .eq("id", schedule.id);

      await supabase.from("activities").insert({
        type: "check_run",
        title: retry
          ? "Scheduled check failed"
          : "Schedule paused after repeated failures",
        description: check.error,
        workspace_id: schedule.workspace_id,
        endpoint_id: schedule.endpoint_id,
        metadata: {
          scheduleId: schedule.id,
          error: check.error,
          consecutiveFailures: failures,
          paused: !retry,
        },
      });

      results.push({
        scheduleId: schedule.id,
        ok: false,
        error: check.error,
      });
    } else {
      await supabase
        .from("schedules")
        .update({
          last_run_at: now,
          consecutive_failures: 0,
          // Anchor on when this run was *due*, not on now — otherwise every
          // tick adds the worker's latency and an hourly schedule slides.
          next_run_at: nextRunAt(
            String(schedule.frequency),
            schedule.due_at,
            startedAt
          ),
        })
        .eq("id", schedule.id);

      results.push({
        scheduleId: schedule.id,
        ok: true,
        diffId: check.diffId,
      });
    }
  }

  return NextResponse.json({
    processed: results.length,
    results,
  });
}

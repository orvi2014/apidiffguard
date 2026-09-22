import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { runEndpointCheck } from "@/lib/run-endpoint-check";
import { nextRunAt, retryRunAt } from "@/lib/schedule-cadence";
import { normalizePlan, planAllowsSchedules } from "@/lib/plans";
import { authorizeCron } from "@/lib/cron-auth";
import { runPool } from "@/lib/concurrency";
import { BATCH_SIZE, CONCURRENCY, DEADLINE_MS } from "@/lib/capacity";

export const runtime = "nodejs";
export const maxDuration = 60;

/*
 * Throughput. A check is almost entirely network wait — an outbound request to
 * someone else's API — so running them one at a time wasted the invocation.
 * Serial, the ceiling was 25 checks per tick, 12 ticks an hour: 300 checks an
 * hour for every customer combined, which one Scale workspace on hourly
 * schedules would consume by itself.
 *
 * Bounded concurrency lifts that without unbounded fan-out: CONCURRENCY caps
 * simultaneous outbound requests (and Supabase connections), BATCH_SIZE caps
 * what one tick claims, and DEADLINE_MS stops starting new work with enough
 * headroom to finish in flight before maxDuration kills the invocation.
 *
 * Claimed-but-unprocessed schedules are safe: claim_due_schedules pushed
 * next_run_at to now() + lease, so they come back on a later tick rather than
 * being lost.
 */
// Runner limits live in @/lib/capacity so the tier quotas in plans.ts can be
// tested against what the platform can actually deliver.

type ClaimedSchedule = {
  id: string;
  workspace_id: string;
  endpoint_id: string;
  frequency: string;
  due_at: string | null;
  consecutive_failures: number | null;
  plan: string | null;
};

type ScheduleResult = {
  scheduleId: string;
  ok: boolean;
  error?: string;
  diffId?: string;
  skipped?: string;
};

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const startedAt = new Date();
  const now = startedAt.toISOString();
  const deadline = startedAt.getTime() + DEADLINE_MS;

  // Claim due rows atomically. `claim_due_schedules` pushes next_run_at forward
  // under `for update skip locked` before returning, so two overlapping cron
  // ticks (the GitHub Action fires every 5 min while maxDuration is 60s) can
  // never pick up the same schedule.
  const { data: due, error } = await supabase.rpc("claim_due_schedules", {
    batch_size: BATCH_SIZE,
    lease_seconds: 300,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const claimed = (due ?? []) as ClaimedSchedule[];

  async function runOne(schedule: ClaimedSchedule): Promise<ScheduleResult> {
    // A workspace downgraded to Free after its schedules were created must stop
    // running them — the create-time guard alone doesn't cover downgrades.
    if (!planAllowsSchedules(normalizePlan(schedule.plan))) {
      await supabase
        .from("schedules")
        .update({ enabled: false })
        .eq("id", schedule.id);

      return { scheduleId: schedule.id, ok: false, skipped: "plan-downgraded" };
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

      return { scheduleId: schedule.id, ok: false, error: check.error };
    }

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

    return { scheduleId: schedule.id, ok: true, diffId: check.diffId };
  }

  const { results, deferred } = await runPool<ClaimedSchedule, ScheduleResult>(
    claimed,
    async (schedule) => {
      try {
        return await runOne(schedule);
      } catch (err) {
        // One endpoint must never take the whole tick down with it.
        return {
          scheduleId: schedule.id,
          ok: false,
          error: err instanceof Error ? err.message : "Unknown error",
        };
      }
    },
    { concurrency: CONCURRENCY, deadline }
  );

  // Anything deferred is not lost — the lease returns it on a later tick — but
  // a persistently non-zero `deferred` means the tick is saturated and the
  // batch size or the cron cadence needs revisiting.

  return NextResponse.json({
    processed: results.length,
    claimed: claimed.length,
    deferred,
    durationMs: Date.now() - startedAt.getTime(),
    results,
  });
}

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { runEndpointCheck } from "@/lib/run-endpoint-check";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorize(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

function nextRunAt(frequency: string, from = new Date()): string {
  const next = new Date(from);
  switch (frequency) {
    case "HOURLY":
      next.setHours(next.getHours() + 1);
      break;
    case "DAILY":
      next.setDate(next.getDate() + 1);
      break;
    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      break;
    case "MONTHLY":
      next.setMonth(next.getMonth() + 1);
      break;
    default:
      next.setHours(next.getHours() + 1);
  }
  return next.toISOString();
}

export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();

  const { data: due, error } = await supabase
    .from("schedules")
    .select("id, workspace_id, endpoint_id, frequency")
    .eq("enabled", true)
    .lte("next_run_at", now)
    .order("next_run_at", { ascending: true })
    .limit(25);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: Array<{
    scheduleId: string;
    ok: boolean;
    error?: string;
    diffId?: string;
  }> = [];

  for (const schedule of due ?? []) {
    const check = await runEndpointCheck(supabase, {
      endpointId: schedule.endpoint_id,
      workspaceId: schedule.workspace_id,
    });

    await supabase
      .from("schedules")
      .update({
        last_run_at: now,
        next_run_at: nextRunAt(String(schedule.frequency)),
      })
      .eq("id", schedule.id);

    if ("error" in check) {
      results.push({
        scheduleId: schedule.id,
        ok: false,
        error: check.error,
      });
    } else {
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

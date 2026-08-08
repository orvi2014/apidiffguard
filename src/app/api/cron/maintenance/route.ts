import { NextResponse } from "next/server";
import { drainAlertDeliveries } from "@/lib/alerts/retry-queue";
import { offloadLargeBodies } from "@/lib/response-body-store";
import { createServiceClient } from "@/lib/supabase/server";
import { authorizeCron } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/cron/maintenance
 *
 * Housekeeping the check pipeline can't do for itself:
 *  - retry alert deliveries that failed, before dead-lettering them
 *  - release endpoints stranded on `CHECKING` by a worker that died mid-run
 *  - drop response bodies and rows past their retention window
 *  - move oversized inline bodies into object storage
 *
 * Safe to run often; every statement is bounded by a time window. The retry
 * backoff starts at one minute, so run this at least every few minutes if you
 * want prompt redelivery — hourly still works, just with hourly granularity.
 */
export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Drained first: a stuck alert is more time-sensitive than housekeeping, and
  // a retention failure should not stop redelivery.
  const alerts = await drainAlertDeliveries(supabase, { batchSize: 20 });

  const { data: reaped, error: reapError } = await supabase.rpc(
    "reap_stuck_checks",
    { older_than_minutes: 15 }
  );

  if (reapError) {
    return NextResponse.json({ error: reapError.message }, { status: 500 });
  }

  const { data: retention, error: retentionError } = await supabase.rpc(
    "apply_retention",
    {
      check_body_days: 30,
      check_days: 90,
      diff_days: 180,
      activity_days: 180,
      alert_history_days: 90,
    }
  );

  if (retentionError) {
    return NextResponse.json(
      { error: retentionError.message },
      { status: 500 }
    );
  }

  // Successful deliveries are audit noise once alert_history has the record.
  // Dead-lettered rows are kept: they are the evidence an alert never arrived.
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  await supabase
    .from("alert_deliveries")
    .delete()
    .eq("status", "SENT")
    .lt("created_at", cutoff);

  // Incremental migration for rows written before offloading existed, plus a
  // safety net for any check whose upload failed and fell back to inline.
  const offload = await offloadLargeBodies(supabase, { limit: 50 });

  return NextResponse.json({
    alerts,
    offload,
    reapedChecks: reaped ?? 0,
    retention: retention ?? {},
  });
}

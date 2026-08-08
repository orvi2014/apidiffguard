import type { SupabaseClient } from "@supabase/supabase-js";
import { deliverAlert, type DeliverableChannel } from "@/lib/alerts/deliver";

/**
 * Backoff schedule for a failed alert delivery, in minutes.
 *
 * Front-loaded because most failures are transient (a rate limit, a brief 5xx)
 * and an alert is worth much less an hour late. The tail is long enough that a
 * destination down for a working day still receives it.
 */
export const RETRY_BACKOFF_MINUTES = [1, 5, 15, 30, 60, 120] as const;

export const MAX_DELIVERY_ATTEMPTS = RETRY_BACKOFF_MINUTES.length;

/**
 * When the next attempt should run, or `null` once the budget is spent.
 * `attempts` is the number already made.
 */
export function nextAttemptAt(attempts: number, now: Date): Date | null {
  if (attempts >= RETRY_BACKOFF_MINUTES.length) return null;
  const minutes = RETRY_BACKOFF_MINUTES[attempts]!;
  return new Date(now.getTime() + minutes * 60_000);
}

export type QueuedDelivery = {
  id: string;
  alert_config_id: string;
  endpoint_id: string | null;
  workspace_id: string;
  severity: string;
  message: string;
  meta: Record<string, unknown> | null;
  attempts: number;
  max_attempts: number;
  channel: string;
  config: Record<string, unknown> | null;
  verified: boolean;
};

/** Park a failed delivery for a later attempt. */
export async function enqueueFailedDelivery(
  supabase: SupabaseClient,
  opts: {
    alertConfigId: string;
    workspaceId: string;
    endpointId?: string | null;
    severity: string;
    message: string;
    meta?: Record<string, unknown>;
    fingerprint?: string | null;
    error?: string;
  }
): Promise<void> {
  const due = nextAttemptAt(1, new Date());
  await supabase.from("alert_deliveries").insert({
    alert_config_id: opts.alertConfigId,
    workspace_id: opts.workspaceId,
    endpoint_id: opts.endpointId ?? null,
    severity: opts.severity,
    message: opts.message,
    meta: opts.meta ?? {},
    fingerprint: opts.fingerprint ?? null,
    status: "RETRYING",
    // The inline send already counts as attempt one.
    attempts: 1,
    max_attempts: MAX_DELIVERY_ATTEMPTS,
    next_attempt_at: (due ?? new Date()).toISOString(),
    last_error: opts.error ?? null,
  });
}

export type DrainResult = {
  claimed: number;
  delivered: number;
  retrying: number;
  deadLettered: number;
};

/**
 * Attempt every claimed delivery once, then record the outcome.
 *
 * Runs from the maintenance cron with the service role.
 */
export async function drainAlertDeliveries(
  supabase: SupabaseClient,
  opts: { batchSize?: number } = {}
): Promise<DrainResult> {
  const { data: claimed, error } = await supabase.rpc(
    "claim_alert_deliveries",
    { batch_size: opts.batchSize ?? 20, lease_seconds: 120 }
  );

  if (error || !claimed?.length) {
    return { claimed: 0, delivered: 0, retrying: 0, deadLettered: 0 };
  }

  const rows = claimed as QueuedDelivery[];
  let delivered = 0;
  let retrying = 0;
  let deadLettered = 0;

  const outcomes = await Promise.allSettled(
    rows.map(async (row) => {
      const attempts = row.attempts + 1;
      const result = await deliverAlert({
        channel: row.channel as DeliverableChannel,
        config: (row.config ?? {}) as Record<string, unknown>,
        message: row.message,
        severity: row.severity,
        event: "diff.detected",
        verified: row.verified,
        meta: (row.meta ?? {}) as Record<string, unknown>,
      });

      const now = new Date();

      if (result.ok) {
        await supabase
          .from("alert_deliveries")
          .update({
            status: "SENT",
            attempts,
            delivered_at: now.toISOString(),
            last_error: null,
            claimed_at: null,
          })
          .eq("id", row.id);
      } else {
        const due =
          attempts >= row.max_attempts ? null : nextAttemptAt(attempts, now);
        await supabase
          .from("alert_deliveries")
          .update({
            // No budget left: stop retrying and leave the row as the record of
            // an alert that never made it, rather than looping forever.
            status: due ? "RETRYING" : "FAILED",
            attempts,
            next_attempt_at: (due ?? now).toISOString(),
            last_error: result.error ?? "Delivery failed",
            claimed_at: null,
          })
          .eq("id", row.id);
      }

      await supabase.from("alert_history").insert({
        alert_config_id: row.alert_config_id,
        status: result.status,
        severity: row.severity,
        message: row.message,
        payload: result.payload ?? null,
        error: result.error ?? null,
        sent_at: result.ok ? now.toISOString() : null,
      });

      return {
        ok: result.ok,
        exhausted: !result.ok && attempts >= row.max_attempts,
      };
    })
  );

  for (const outcome of outcomes) {
    if (outcome.status !== "fulfilled") {
      retrying += 1;
      continue;
    }
    if (outcome.value.ok) delivered += 1;
    else if (outcome.value.exhausted) deadLettered += 1;
    else retrying += 1;
  }

  return { claimed: rows.length, delivered, retrying, deadLettered };
}

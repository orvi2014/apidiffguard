/**
 * POST /api/webhooks/polar — sync workspace plan from Polar events.
 *
 * Grant on:  subscription.active, subscription.uncanceled, subscription.cycled,
 *            subscription.resumed
 * Revoke on: subscription.revoked, subscription.canceled, subscription.paused
 * Dunning:   order.refunded, subscription.past_due
 *
 * Mirrors the Stripe route's guarantees rather than trusting the provider:
 * every event is claimed exactly once, out-of-order events are dropped, and a
 * handler failure releases the claim so the retry can actually re-run.
 */

import { NextResponse } from "next/server";
import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";
import {
  resolvePolarPlan,
  resolveWorkspaceId,
} from "@/lib/polar/billing";
import type { PlanId } from "@/lib/plans";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROVIDER = "polar";

const GRANTING = new Set([
  "subscription.active",
  "subscription.uncanceled",
  "subscription.cycled",
  "subscription.resumed",
]);

const REVOKING = new Set([
  "subscription.revoked",
  "subscription.canceled",
  "subscription.paused",
]);

type SubscriptionLike = {
  id?: string;
  status?: string;
  productId?: string | null;
  customerId?: string | null;
  metadata?: Record<string, unknown> | null;
  customer?: { id?: string; externalId?: string | null } | null;
};

/** Claim the event id. Returns false when it has already been handled. */
async function claimEvent(
  eventId: string,
  type: string,
  objectId: string | null,
  createdAt: Date
): Promise<boolean> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("billing_events").insert({
    provider: PROVIDER,
    event_id: eventId,
    type,
    object_id: objectId,
    event_created_at: createdAt.toISOString(),
  });

  if (!error) return true;
  if (error.code === "23505") return false; // already processed
  throw new Error(error.message);
}

async function releaseClaim(eventId: string) {
  const supabase = createServiceClient();
  await supabase
    .from("billing_events")
    .delete()
    .eq("provider", PROVIDER)
    .eq("event_id", eventId);
}

async function isStaleEvent(
  workspaceId: string,
  eventCreatedAt: Date
): Promise<boolean> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("workspaces")
    .select("billing_event_at")
    .eq("id", workspaceId)
    .maybeSingle();

  const applied = data?.billing_event_at
    ? new Date(data.billing_event_at)
    : null;
  return applied !== null && applied.getTime() > eventCreatedAt.getTime();
}

async function applyPlan(input: {
  workspaceId: string;
  plan: PlanId;
  polarCustomerId?: string | null;
  polarSubscriptionId?: string | null;
  eventCreatedAt: Date;
  clearPaymentFailure?: boolean;
}) {
  if (await isStaleEvent(input.workspaceId, input.eventCreatedAt)) {
    console.warn(
      `[polar] Skipping out-of-order event for workspace ${input.workspaceId}`
    );
    return;
  }

  const supabase = createServiceClient();
  const patch: Record<string, unknown> = {
    plan: input.plan,
    billing_event_at: input.eventCreatedAt.toISOString(),
  };
  if (input.polarCustomerId) patch.polar_customer_id = input.polarCustomerId;
  if (input.polarSubscriptionId) {
    patch.polar_subscription_id = input.polarSubscriptionId;
  }
  if (input.clearPaymentFailure) patch.payment_failed_at = null;

  const { error } = await supabase
    .from("workspaces")
    .update(patch)
    .eq("id", input.workspaceId);

  if (error) throw new Error(error.message);

  await supabase.from("activities").insert({
    type: "billing_updated",
    title: `Plan changed to ${input.plan}`,
    description: `Updated from a Polar ${input.plan === "free" ? "cancellation" : "subscription"} event`,
    workspace_id: input.workspaceId,
  });
}

export async function POST(request: Request) {
  const secret = process.env.POLAR_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Polar webhook is not configured" },
      { status: 503 }
    );
  }

  // Raw body: the signature covers the exact bytes, so it must not be parsed
  // and re-serialised first.
  const body = await request.text();
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  let event: { type: string; data: unknown };
  try {
    event = validateEvent(body, headers, secret) as {
      type: string;
      data: unknown;
    };
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Standard Webhooks: `webhook-id` is the unique delivery id and `webhook-
  // timestamp` the send time. Both are covered by the signature we just
  // verified, so they are safe to trust for idempotency and ordering.
  const eventId = headers["webhook-id"] ?? "";
  const timestamp = Number(headers["webhook-timestamp"] ?? "");
  const eventCreatedAt = Number.isFinite(timestamp)
    ? new Date(timestamp * 1000)
    : new Date();

  if (!eventId) {
    return NextResponse.json({ error: "Missing webhook id" }, { status: 400 });
  }

  const subscription = (event.data ?? {}) as SubscriptionLike;
  const workspaceId = resolveWorkspaceId({
    externalCustomerId: subscription.customer?.externalId,
    metadata: subscription.metadata ?? null,
  });

  let claimed = false;
  try {
    claimed = await claimEvent(
      eventId,
      event.type,
      subscription.id ?? null,
      eventCreatedAt
    );
  } catch (err) {
    console.error("[polar] claim failed:", err);
    return NextResponse.json({ error: "Claim failed" }, { status: 500 });
  }

  if (!claimed) {
    // Already handled. Acknowledge so Polar stops retrying.
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    if (!workspaceId) {
      // Nothing to route it to. Acknowledged and recorded so it is not retried
      // forever, but logged loudly because it means a checkout was created
      // without the workspace binding.
      console.warn(`[polar] ${event.type} with no workspace binding`);
      return NextResponse.json({ received: true, ignored: true });
    }

    if (GRANTING.has(event.type)) {
      const plan = resolvePolarPlan({
        productId: subscription.productId,
        metadata: subscription.metadata ?? null,
      });
      if (!plan) {
        console.warn(
          `[polar] ${event.type} for an unmapped product ${subscription.productId}`
        );
        return NextResponse.json({ received: true, ignored: true });
      }
      await applyPlan({
        workspaceId,
        plan,
        polarCustomerId: subscription.customer?.id ?? subscription.customerId,
        polarSubscriptionId: subscription.id ?? null,
        eventCreatedAt,
        clearPaymentFailure: true,
      });
    } else if (REVOKING.has(event.type)) {
      await applyPlan({
        workspaceId,
        plan: "free",
        polarCustomerId: subscription.customer?.id ?? subscription.customerId,
        polarSubscriptionId: subscription.id ?? null,
        eventCreatedAt,
      });
    } else if (event.type === "subscription.past_due") {
      // Keep the plan: Polar is still retrying the card. The banner tells the
      // customer before access disappears.
      const supabase = createServiceClient();
      await supabase
        .from("workspaces")
        .update({ payment_failed_at: eventCreatedAt.toISOString() })
        .eq("id", workspaceId);
      await supabase.from("activities").insert({
        type: "billing_payment_failed",
        title: "Payment failed",
        description: "Polar could not charge the card on file.",
        workspace_id: workspaceId,
      });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    // Release the claim so Polar's retry re-runs the handler instead of hitting
    // the duplicate short-circuit above and silently dropping the change.
    await releaseClaim(eventId).catch(() => undefined);
    console.error("[polar] handler failed:", err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
}

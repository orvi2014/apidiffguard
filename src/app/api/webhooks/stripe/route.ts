/**
 * POST /api/webhooks/stripe — sync workspace plan from Stripe events.
 *
 * Events:
 *   - checkout.session.completed
 *   - customer.subscription.updated
 *   - customer.subscription.deleted
 *   - invoice.payment_failed
 */

import { NextResponse } from "next/server";
import { resolvePaidPlan } from "@/lib/stripe/billing";
import { verifyStripeSignature } from "@/lib/stripe/verify";
import type { PlanId } from "@/lib/plans";
import { createServiceClient } from "@/lib/supabase/server";

interface StripeSubscription {
  id: string;
  status: string;
  customer: string;
  items: { data: Array<{ price: { lookup_key: string | null } }> };
  metadata: Record<string, string>;
}

interface StripeInvoice {
  subscription: string | { id?: string } | null;
  customer: string;
  metadata: Record<string, string>;
}

interface StripeCheckoutSession {
  customer: string;
  metadata: Record<string, string>;
  mode: string;
}

interface StripeEvent {
  id: string;
  type: string;
  created: number;
  data: { object: Record<string, unknown> };
}

/**
 * Record the event id before handling it. Returns false if we've already
 * processed this id — Stripe retries on any non-2xx, and the ±300s signature
 * tolerance also leaves a replay window for a captured request.
 */
async function claimEvent(event: StripeEvent, objectId: string | null) {
  const supabase = createServiceClient();
  const { error } = await supabase.from("stripe_events").insert({
    id: event.id,
    type: event.type,
    object_id: objectId,
    event_created_at: new Date(event.created * 1000).toISOString(),
  });

  if (!error) return { fresh: true as const };
  // 23505 = unique violation: already handled.
  if (error.code === "23505") return { fresh: false as const };
  throw new Error(error.message);
}

/**
 * Stripe does not guarantee delivery order. Applying an older subscription
 * event after a newer one can downgrade a workspace that is actually active,
 * so every billing write carries the event timestamp and older writes are
 * dropped.
 */
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

async function updateWorkspaceBilling(
  workspaceId: string,
  plan: PlanId,
  stripeCustomerId?: string | null,
  eventCreatedAt?: Date
) {
  if (eventCreatedAt && (await isStaleEvent(workspaceId, eventCreatedAt))) {
    console.warn(
      `[stripe] Skipping out-of-order event for workspace ${workspaceId}`
    );
    return;
  }

  const supabase = createServiceClient();
  const patch: Record<string, string | null> = { plan };
  if (stripeCustomerId) {
    patch.stripe_customer_id = stripeCustomerId;
  }
  if (eventCreatedAt) {
    patch.billing_event_at = eventCreatedAt.toISOString();
  }
  // A successful plan write clears any outstanding payment-failure banner.
  if (plan !== "free") {
    patch.payment_failed_at = null;
  }

  const { error } = await supabase
    .from("workspaces")
    .update(patch)
    .eq("id", workspaceId);
  if (error) {
    throw new Error(error.message);
  }
}

async function resolveWorkspaceIdFromSubscription(
  subscriptionId: string
): Promise<string | null> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`,
      { headers: { Authorization: `Bearer ${key}` } }
    );
    if (!res.ok) return null;
    const sub = (await res.json()) as { metadata?: Record<string, string> };
    return sub.metadata?.workspace_id ?? null;
  } catch {
    return null;
  }
}

async function findWorkspaceIdByCustomer(
  customerId: string
): Promise<string | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("workspaces")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return data?.id ?? null;
}

async function handleCheckoutCompleted(
  session: StripeCheckoutSession,
  eventCreatedAt: Date
) {
  const workspaceId = session.metadata.workspace_id;
  if (!workspaceId) return;

  const plan = resolvePaidPlan(session.metadata.plan);
  if (!plan) return;

  await updateWorkspaceBilling(
    workspaceId,
    plan,
    session.customer || null,
    eventCreatedAt
  );
}

async function handleSubscriptionUpdated(
  subscription: StripeSubscription,
  eventCreatedAt: Date
) {
  const workspaceId =
    subscription.metadata.workspace_id ||
    (await findWorkspaceIdByCustomer(String(subscription.customer)));
  if (!workspaceId) return;

  if (subscription.status !== "active" && subscription.status !== "trialing") {
    await updateWorkspaceBilling(workspaceId, "free", null, eventCreatedAt);
    return;
  }

  const plan = resolvePaidPlan(
    subscription.items.data[0]?.price?.lookup_key ?? null
  );
  if (!plan) return;

  await updateWorkspaceBilling(
    workspaceId,
    plan,
    String(subscription.customer),
    eventCreatedAt
  );
}

async function handleSubscriptionDeleted(
  subscription: StripeSubscription,
  eventCreatedAt: Date
) {
  const workspaceId =
    subscription.metadata.workspace_id ||
    (await findWorkspaceIdByCustomer(String(subscription.customer)));
  if (!workspaceId) return;
  await updateWorkspaceBilling(workspaceId, "free", null, eventCreatedAt);
}

async function handlePaymentFailed(invoice: StripeInvoice) {
  let workspaceId: string | null = invoice.metadata.workspace_id ?? null;
  const subId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription?.id;

  if (!workspaceId && subId) {
    workspaceId = await resolveWorkspaceIdFromSubscription(subId);
  }
  if (!workspaceId && invoice.customer) {
    workspaceId = await findWorkspaceIdByCustomer(String(invoice.customer));
  }
  if (!workspaceId) return;

  // Keep the current plan through Stripe retries — downgrade only on an actual
  // cancellation. But record the failure so the console can warn the user
  // instead of the service silently dying when retries run out.
  const supabase = createServiceClient();
  await supabase
    .from("workspaces")
    .update({ payment_failed_at: new Date().toISOString() })
    .eq("id", workspaceId)
    .is("payment_failed_at", null);

  await supabase.from("activities").insert({
    type: "billing_payment_failed",
    title: "Payment failed",
    description:
      "Stripe could not charge your card. Update your payment method in Settings → Billing before the subscription is cancelled.",
    workspace_id: workspaceId,
  });
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe] STRIPE_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Misconfigured" }, { status: 500 });
  }

  const body = await request.text();
  const signatureHeader = request.headers.get("stripe-signature");
  if (!signatureHeader) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  const isValid = await verifyStripeSignature(
    body,
    signatureHeader,
    webhookSecret
  );
  if (!isValid) {
    return NextResponse.json(
      { error: "Invalid signature", code: "INVALID_SIGNATURE" },
      { status: 400 }
    );
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(body) as StripeEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!event.id || typeof event.created !== "number") {
    return NextResponse.json({ error: "Malformed event" }, { status: 400 });
  }

  const eventCreatedAt = new Date(event.created * 1000);
  const objectId =
    typeof event.data?.object?.id === "string" ? event.data.object.id : null;

  try {
    const claim = await claimEvent(event, objectId);
    if (!claim.fresh) {
      // Already applied — ack so Stripe stops retrying.
      return NextResponse.json({ received: true, duplicate: true });
    }
  } catch (err) {
    console.error("[stripe] Could not record event id:", err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          event.data.object as unknown as StripeCheckoutSession,
          eventCreatedAt
        );
        break;
      case "invoice.payment_failed":
        await handlePaymentFailed(
          event.data.object as unknown as StripeInvoice
        );
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as unknown as StripeSubscription,
          eventCreatedAt
        );
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as unknown as StripeSubscription,
          eventCreatedAt
        );
        break;
      default:
        break;
    }
  } catch (err) {
    console.error(`[stripe] Error handling event ${event.type}:`, err);
    // Release the claim so Stripe's retry can actually re-run the handler.
    await createServiceClient()
      .from("stripe_events")
      .delete()
      .eq("id", event.id);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

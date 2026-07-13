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
import { LOOKUP_KEY_TO_PLAN } from "@/lib/stripe/billing";
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
  data: { object: Record<string, unknown> };
}

async function verifyStripeSignature(
  body: string,
  signatureHeader: string,
  secret: string
): Promise<boolean> {
  const parts = signatureHeader.split(",");
  const tPart = parts.find((p) => p.startsWith("t="));
  const v1Parts = parts.filter((p) => p.startsWith("v1="));
  if (!tPart || v1Parts.length === 0) return false;

  const timestamp = tPart.slice(2);
  const tsSeconds = Number.parseInt(timestamp, 10);
  if (Number.isNaN(tsSeconds) || Math.abs(Date.now() / 1000 - tsSeconds) > 300) {
    return false;
  }

  const payload = `${timestamp}.${body}`;
  const keyData = new TextEncoder().encode(secret);
  const msgData = new TextEncoder().encode(payload);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
  const expected =
    "v1=" +
    Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

  return v1Parts.some((v1) => {
    if (v1.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < v1.length; i++) {
      diff |= v1.charCodeAt(i) ^ expected.charCodeAt(i);
    }
    return diff === 0;
  });
}

async function updateWorkspaceBilling(
  workspaceId: string,
  plan: PlanId,
  stripeCustomerId?: string | null
) {
  const supabase = createServiceClient();
  const patch: Record<string, string> = { plan };
  if (stripeCustomerId) {
    patch.stripe_customer_id = stripeCustomerId;
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

async function handleCheckoutCompleted(session: StripeCheckoutSession) {
  const workspaceId = session.metadata.workspace_id;
  if (!workspaceId) return;

  const planRaw = session.metadata.plan;
  const plan =
    planRaw && planRaw in LOOKUP_KEY_TO_PLAN
      ? LOOKUP_KEY_TO_PLAN[planRaw]
      : null;
  if (!plan) return;

  await updateWorkspaceBilling(workspaceId, plan, session.customer || null);
}

async function handleSubscriptionUpdated(subscription: StripeSubscription) {
  const workspaceId =
    subscription.metadata.workspace_id ||
    (await findWorkspaceIdByCustomer(String(subscription.customer)));
  if (!workspaceId) return;

  if (subscription.status !== "active" && subscription.status !== "trialing") {
    await updateWorkspaceBilling(workspaceId, "free");
    return;
  }

  const lookupKey = subscription.items.data[0]?.price?.lookup_key ?? null;
  const plan = lookupKey ? LOOKUP_KEY_TO_PLAN[lookupKey] : null;
  if (!plan) return;

  await updateWorkspaceBilling(
    workspaceId,
    plan,
    String(subscription.customer)
  );
}

async function handleSubscriptionDeleted(subscription: StripeSubscription) {
  const workspaceId =
    subscription.metadata.workspace_id ||
    (await findWorkspaceIdByCustomer(String(subscription.customer)));
  if (!workspaceId) return;
  await updateWorkspaceBilling(workspaceId, "free");
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

  // Keep the current plan through Stripe retries. Downgrade only when the
  // subscription is deleted or updated to a free/canceled state.
  console.warn(
    `[stripe] Payment failed for workspace ${workspaceId} — plan unchanged pending retry or cancellation`
  );
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

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          event.data.object as unknown as StripeCheckoutSession
        );
        break;
      case "invoice.payment_failed":
        await handlePaymentFailed(
          event.data.object as unknown as StripeInvoice
        );
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as unknown as StripeSubscription
        );
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as unknown as StripeSubscription
        );
        break;
      default:
        break;
    }
  } catch (err) {
    console.error(`[stripe] Error handling event ${event.type}:`, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

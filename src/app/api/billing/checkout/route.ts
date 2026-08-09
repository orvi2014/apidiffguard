/**
 * POST /api/billing/checkout — subscription checkout for starter / pro.
 *
 * Provider-neutral by design: the button in the UI does not know or care which
 * processor is live, so switching providers is an environment change rather
 * than a frontend change.
 */

import { NextResponse } from "next/server";
import { getBillingProvider } from "@/lib/billing/provider";
import { createPolarCheckoutUrl } from "@/lib/polar/billing";
import { isPaidPlan } from "@/lib/plans";
import {
  createSubscriptionCheckoutUrl,
  ensureStripeCustomer,
} from "@/lib/stripe/billing";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";

export async function POST(request: Request) {
  const provider = getBillingProvider();
  if (!provider) {
    return NextResponse.json(
      { error: "Billing is not configured" },
      { status: 503 }
    );
  }

  const ctx = await getWorkspaceContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only owners and admins can manage billing" },
      { status: 403 }
    );
  }

  let body: { plan?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const plan = String(body.plan ?? "").toLowerCase();
  if (!isPaidPlan(plan)) {
    return NextResponse.json(
      { error: "plan must be starter or pro" },
      { status: 400 }
    );
  }

  if (provider === "polar") {
    // No customer is created up front: Polar creates one at checkout and binds
    // it to the workspace through externalCustomerId, which the webhook reads
    // back. One fewer API call, and no orphan customer if checkout is abandoned.
    const result = await createPolarCheckoutUrl({
      workspaceId: ctx.workspaceId,
      targetPlan: plan,
      customerEmail: ctx.email,
      polarCustomerId: ctx.polarCustomerId,
    });

    if ("error" in result) {
      console.error("[billing/checkout] polar:", result.error);
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ url: result.url });
  }

  const supabase = await createClient();
  let stripeCustomerId = ctx.stripeCustomerId;

  if (!stripeCustomerId) {
    const ensured = await ensureStripeCustomer({
      workspaceId: ctx.workspaceId,
      workspaceName: ctx.workspaceName,
      email: ctx.email,
      existingCustomerId: null,
    });
    if ("error" in ensured) {
      return NextResponse.json({ error: ensured.error }, { status: 500 });
    }
    stripeCustomerId = ensured.customerId;
    const { error } = await supabase
      .from("workspaces")
      .update({ stripe_customer_id: stripeCustomerId })
      .eq("id", ctx.workspaceId);
    if (error) {
      return NextResponse.json(
        { error: "Failed to save Stripe customer" },
        { status: 500 }
      );
    }
  }

  const result = await createSubscriptionCheckoutUrl({
    workspaceId: ctx.workspaceId,
    workspaceName: ctx.workspaceName,
    targetPlan: plan,
    customerEmail: ctx.email,
    stripeCustomerId,
  });

  if ("error" in result) {
    console.error("[billing/checkout] stripe:", result.error);
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ url: result.url });
}

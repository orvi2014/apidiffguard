/**
 * POST /api/billing/checkout — Stripe Checkout for starter / pro plans.
 */

import { NextResponse } from "next/server";
import {
  createSubscriptionCheckoutUrl,
  ensureStripeCustomer,
  isPaidPlan,
} from "@/lib/stripe/billing";
import { isStripeConfigured } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured" },
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
    console.error("[billing/checkout]", result.error);
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ url: result.url });
}

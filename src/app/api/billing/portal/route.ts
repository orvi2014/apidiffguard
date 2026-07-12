/**
 * POST /api/billing/portal — Stripe Customer Portal for subscription management.
 */

import { NextResponse } from "next/server";
import { createCustomerPortalUrl } from "@/lib/stripe/billing";
import { isStripeConfigured } from "@/lib/stripe/server";
import { getWorkspaceContext } from "@/lib/workspace";

export async function POST() {
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

  if (!ctx.stripeCustomerId) {
    return NextResponse.json(
      {
        error:
          "No Stripe customer on file. Subscribe to a paid plan first.",
      },
      { status: 400 }
    );
  }

  const result = await createCustomerPortalUrl(ctx.stripeCustomerId);
  if ("error" in result) {
    console.error("[billing/portal]", result.error);
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ url: result.url });
}

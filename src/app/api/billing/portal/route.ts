/**
 * POST /api/billing/portal — customer portal for subscription management.
 *
 * Dispatches on the configured provider, same as checkout.
 */

import { NextResponse } from "next/server";
import { getBillingProvider } from "@/lib/billing/provider";
import { createPolarPortalUrl } from "@/lib/polar/billing";
import { createCustomerPortalUrl } from "@/lib/stripe/billing";
import { getWorkspaceContext } from "@/lib/workspace";

export async function POST() {
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

  const customerId =
    provider === "polar" ? ctx.polarCustomerId : ctx.stripeCustomerId;

  if (!customerId) {
    return NextResponse.json(
      { error: "No billing customer on file. Subscribe to a paid plan first." },
      { status: 400 }
    );
  }

  const result =
    provider === "polar"
      ? await createPolarPortalUrl(customerId)
      : await createCustomerPortalUrl(customerId);

  if ("error" in result) {
    console.error(`[billing/portal] ${provider}:`, result.error);
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ url: result.url });
}

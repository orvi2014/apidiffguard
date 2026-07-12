/**
 * APIDiffGuard subscription checkout + Customer Portal (platform Stripe account).
 * Pattern ported from noburn: lookup_key → price → Checkout / Portal.
 */

import type Stripe from "stripe";
import { isPaidPlan, type PaidPlanId } from "@/lib/plans";
import { getStripe } from "@/lib/stripe/server";
import { SITE_URL } from "@/lib/seo";

export type PaidPlan = PaidPlanId;

/** Stripe Price lookup_key → app plan (must match webhook). */
export const LOOKUP_KEY_TO_PLAN: Record<string, PaidPlan> = {
  apidiffguard_starter_monthly: "starter",
  apidiffguard_pro_monthly: "pro",
};

export const PLAN_TO_LOOKUP_KEY: Record<PaidPlan, string> = {
  starter: "apidiffguard_starter_monthly",
  pro: "apidiffguard_pro_monthly",
};

export { isPaidPlan };

async function resolvePriceId(
  stripe: Stripe,
  lookupKey: string
): Promise<string | null> {
  const prices = await stripe.prices.list({
    lookup_keys: [lookupKey],
    active: true,
    limit: 1,
  });
  return prices.data[0]?.id ?? null;
}

export async function createSubscriptionCheckoutUrl(input: {
  workspaceId: string;
  workspaceName: string;
  targetPlan: PaidPlan;
  customerEmail?: string;
  stripeCustomerId?: string | null;
}): Promise<{ url: string } | { error: string }> {
  const stripe = getStripe();
  if (!stripe) return { error: "Stripe is not configured" };

  const lookupKey = PLAN_TO_LOOKUP_KEY[input.targetPlan];
  const priceId = await resolvePriceId(stripe, lookupKey);
  if (!priceId) {
    return { error: `Stripe price not found for lookup key ${lookupKey}` };
  }

  const base = SITE_URL.replace(/\/$/, "");
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: input.stripeCustomerId ?? undefined,
    customer_email: input.stripeCustomerId ? undefined : input.customerEmail,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${base}/settings/billing?checkout=success`,
    cancel_url: `${base}/settings/billing?checkout=cancelled`,
    allow_promotion_codes: true,
    subscription_data: {
      metadata: {
        workspace_id: input.workspaceId,
      },
    },
    metadata: {
      workspace_id: input.workspaceId,
      plan: lookupKey,
    },
  });

  if (!session.url) return { error: "Stripe did not return a checkout URL" };
  return { url: session.url };
}

export async function createCustomerPortalUrl(
  stripeCustomerId: string
): Promise<{ url: string } | { error: string }> {
  const stripe = getStripe();
  if (!stripe) return { error: "Stripe is not configured" };

  const base = SITE_URL.replace(/\/$/, "");
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${base}/settings/billing`,
  });

  return { url: session.url };
}

export async function ensureStripeCustomer(input: {
  workspaceId: string;
  workspaceName: string;
  email?: string;
  existingCustomerId?: string | null;
}): Promise<{ customerId: string } | { error: string }> {
  if (input.existingCustomerId) {
    return { customerId: input.existingCustomerId };
  }

  const stripe = getStripe();
  if (!stripe) return { error: "Stripe is not configured" };

  const customer = await stripe.customers.create({
    email: input.email,
    name: input.workspaceName,
    metadata: {
      workspace_id: input.workspaceId,
    },
  });

  return { customerId: customer.id };
}

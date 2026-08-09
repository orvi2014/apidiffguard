import { isPolarConfigured } from "@/lib/polar/server";
import { isStripeConfigured } from "@/lib/stripe/server";

/**
 * Which payment provider is live.
 *
 * Both integrations ship; configuration decides. Polar wins when both are
 * present because it is the merchant of record — if someone has gone to the
 * trouble of configuring it, charging through Stripe instead would put the tax
 * liability back on the seller, which is the opposite of what they asked for.
 *
 * Deliberately never returns both: two active providers means a workspace can
 * hold two live subscriptions for the same plan, and neither webhook knows
 * about the other.
 */
export type BillingProvider = "polar" | "stripe";

export function getBillingProvider(): BillingProvider | null {
  if (isPolarConfigured()) return "polar";
  if (isStripeConfigured()) return "stripe";
  return null;
}

export function isBillingConfigured(): boolean {
  return getBillingProvider() !== null;
}

/** Human name for UI copy. */
export function billingProviderLabel(
  provider: BillingProvider | null
): string {
  if (provider === "polar") return "Polar";
  if (provider === "stripe") return "Stripe";
  return "a payment provider";
}

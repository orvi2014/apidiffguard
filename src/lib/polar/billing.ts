import { isPaidPlan, type PaidPlanId } from "@/lib/plans";
import { getPolar } from "@/lib/polar/server";
import { SITE_URL } from "@/lib/seo";

export type PaidPlan = PaidPlanId;

/**
 * Plan ↔ Polar product mapping.
 *
 * Polar has no equivalent of Stripe's `lookup_key`, so the binding is an
 * environment variable per plan. Read at call time rather than module load so a
 * deployment that sets them later does not need a rebuild to pick them up.
 */
export function polarProductForPlan(plan: PaidPlan): string | null {
  const raw =
    plan === "starter"
      ? process.env.POLAR_PRODUCT_STARTER
      : process.env.POLAR_PRODUCT_PRO;
  const id = raw?.trim();
  return id ? id : null;
}

/** Reverse of {@link polarProductForPlan}, for webhook payloads. */
export function resolvePolarPlanFromProduct(
  productId: string | null | undefined
): PaidPlan | null {
  if (!productId) return null;
  const id = productId.trim();
  if (!id) return null;
  if (id === process.env.POLAR_PRODUCT_STARTER?.trim()) return "starter";
  if (id === process.env.POLAR_PRODUCT_PRO?.trim()) return "pro";
  return null;
}

/**
 * Resolve the plan a Polar event refers to.
 *
 * Product id is authoritative. Checkout metadata is the fallback, because a
 * product can be renamed or replaced in Polar while an old subscription keeps
 * referring to the previous id — dropping the upgrade in that case would be
 * worse than trusting the metadata we wrote ourselves.
 */
export function resolvePolarPlan(input: {
  productId?: string | null;
  metadata?: Record<string, unknown> | null;
}): PaidPlan | null {
  const fromProduct = resolvePolarPlanFromProduct(input.productId);
  if (fromProduct) return fromProduct;

  const raw = input.metadata?.plan;
  if (typeof raw !== "string") return null;
  const plan = raw.trim().toLowerCase();
  return isPaidPlan(plan) ? plan : null;
}

/**
 * The workspace an event belongs to.
 *
 * We set both `externalCustomerId` and `metadata.workspace_id` at checkout, and
 * read either back. Polar surfaces the external id on the customer object while
 * metadata rides on the subscription, and which one is populated depends on the
 * event — accepting both means no event is orphaned.
 */
export function resolveWorkspaceId(input: {
  externalCustomerId?: string | null;
  metadata?: Record<string, unknown> | null;
}): string | null {
  const external = input.externalCustomerId?.trim();
  if (external) return external;
  const raw = input.metadata?.workspace_id;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

export async function createPolarCheckoutUrl(input: {
  workspaceId: string;
  targetPlan: PaidPlan;
  customerEmail?: string;
  polarCustomerId?: string | null;
}): Promise<{ url: string } | { error: string }> {
  const polar = getPolar();
  if (!polar) return { error: "Polar is not configured" };

  const productId = polarProductForPlan(input.targetPlan);
  if (!productId) {
    return {
      error: `No Polar product configured for the ${input.targetPlan} plan.`,
    };
  }

  const base = SITE_URL.replace(/\/$/, "");

  try {
    const checkout = await polar.checkouts.create({
      products: [productId],
      successUrl: `${base}/settings/billing?checkout=success`,
      // Binds the Polar customer to our workspace on first purchase, so every
      // later event can be routed without a lookup table.
      externalCustomerId: input.workspaceId,
      customerEmail: input.polarCustomerId ? undefined : input.customerEmail,
      metadata: {
        workspace_id: input.workspaceId,
        plan: input.targetPlan,
      },
    });

    if (!checkout.url) return { error: "Polar did not return a checkout URL" };
    return { url: checkout.url };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Polar checkout failed",
    };
  }
}

export async function createPolarPortalUrl(
  polarCustomerId: string
): Promise<{ url: string } | { error: string }> {
  const polar = getPolar();
  if (!polar) return { error: "Polar is not configured" };

  try {
    const session = await polar.customerSessions.create({
      customerId: polarCustomerId,
    });
    return { url: session.customerPortalUrl };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Could not open Polar portal",
    };
  }
}

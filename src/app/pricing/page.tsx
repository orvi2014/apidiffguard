import { Suspense, cache } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import type { Metadata } from "next";
import { CheckoutButton, PortalButton } from "@/components/billing/stripe-actions";
import {
  BillingIntervalProvider,
  BillingIntervalToggle,
  PlanPrice,
  PlanStartLink,
} from "@/components/billing/billing-interval";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/chrome";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { isPaidPlan, PLANS, type PlanId } from "@/lib/plans";
import { getBillingProvider } from "@/lib/billing/provider";
import { buildMetadata, faqJsonLd } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";

export const metadata: Metadata = buildMetadata({
  title: "Pricing — Free API Monitoring & Paid Schedules",
  description:
    "Start free with 3 endpoints. Upgrade for scheduled API checks, Slack alerts, and team workspaces. No credit card to try APIDiffGuard.",
  path: "/pricing",
});

const faqs = [
  {
    q: "Is this just a JSON diff tool?",
    a: "No. APIDiffGuard monitors live endpoints, stores versioned baselines, schedules checks, and alerts on schema drift — the diff viewer is the signature surface, not the whole product.",
  },
  {
    q: "Can I ignore volatile fields?",
    a: "Built-in defaults ignore volatile leaf names (request_id, timestamp, and similar). Add custom paths on each endpoint’s Ignore rules panel.",
  },
  {
    q: "Is there a CLI?",
    a: "Yes. Use apidiff check from packages/cli (with --header for private APIs) or POST /api/v1/endpoints/:id/check with a workspace token from Settings → API tokens.",
  },
  {
    q: "What happens if I run out of checks?",
    a: "Scheduled and manual checks pause until the next monthly period — nothing is deleted, and your baselines and history stay intact. Free includes 250 checks/month, Starter 5,000, and Pro 25,000.",
  },
  {
    q: "What auth types are supported?",
    a: "Bearer, API key, Basic, OAuth token, and custom headers.",
  },
];

/**
 * Viewer lookup for the pricing page, deduped across the several Suspense
 * boundaries below so the whole page costs one Supabase round-trip.
 */
const getPricingViewer = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const ctx = user ? await getWorkspaceContext() : null;
  return {
    signedIn: !!user,
    email: ctx?.email ?? null,
    currentPlan: ctx?.plan ?? null,
    // Whichever provider is live owns the customer id. Checking Stripe's
    // unconditionally left real Polar customers unable to reach billing.
    hasCustomer: Boolean(
      getBillingProvider() === "polar"
        ? ctx?.polarCustomerId
        : ctx?.stripeCustomerId
    ),
  };
});

async function ViewerPlanLine() {
  const viewer = await getPricingViewer();
  if (!viewer.currentPlan) return null;
  return (
    <>
      {" "}
      Signed in as {viewer.email} · current plan{" "}
      <strong className="font-medium text-foreground">
        {viewer.currentPlan}
      </strong>
      .
    </>
  );
}

async function ViewerPlanCta({
  planId,
  highlighted,
  contactOnly,
  stripeReady,
}: {
  planId: PlanId;
  highlighted: boolean;
  contactOnly: boolean;
  stripeReady: boolean;
}) {
  const viewer = await getPricingViewer();
  return (
    <PlanCta
      planId={planId}
      highlighted={highlighted}
      contactOnly={contactOnly}
      signedIn={viewer.signedIn}
      currentPlan={viewer.currentPlan}
      stripeReady={stripeReady}
      hasCustomer={viewer.hasCustomer}
    />
  );
}

// Static shell. Everything that depends on who is viewing is streamed behind
// Suspense, so the plan grid, copy, and FAQ render without waiting on auth.
export default function PricingPage() {
  const stripeReady = getBillingProvider() !== null;

  return (
    <div className="min-h-screen">
      <JsonLd data={faqJsonLd(faqs)} />
      <MarketingHeader />
      <main id="main" className="mx-auto max-w-6xl px-4 py-12 sm:px-5 sm:py-20">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Pricing for API monitoring
        </h1>
        <p className="mt-3 max-w-lg text-sm text-muted sm:text-base">
          Start free. Scale when monitoring becomes part of how you ship.
          <Suspense fallback={null}>
            <ViewerPlanLine />
          </Suspense>
        </p>

        <BillingIntervalProvider>
        <BillingIntervalToggle className="mt-8 flex flex-wrap items-center sm:mt-10" />

        <div className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-px lg:overflow-hidden lg:rounded-lg lg:border lg:border-border lg:bg-border">
          {PLANS.map((plan) => (
            <article
              key={plan.id}
              className={`flex flex-col rounded-lg border border-border bg-background p-5 sm:p-6 lg:rounded-none lg:border-0 ${
                plan.highlighted
                  ? "bg-surface ring-1 ring-inset ring-accent/40 lg:ring-0 lg:shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--accent),transparent_60%)]"
                  : ""
              }`}
            >
              <div className="text-sm font-medium text-muted">{plan.name}</div>
              <PlanPrice
                priceLabel={plan.priceLabel}
                period={plan.period}
                yearlyPrice={plan.yearlyPrice}
              />
              <p className="mt-3 text-sm text-muted leading-relaxed">
                {plan.description}
              </p>
              <ul className="mt-6 flex-1 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check
                      className="mt-0.5 size-3.5 shrink-0 text-accent"
                      aria-hidden
                    />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Suspense
                  fallback={
                    <PlanCta
                      planId={plan.id}
                      highlighted={!!plan.highlighted}
                      contactOnly={!!plan.contactOnly}
                      signedIn={false}
                      currentPlan={null}
                      stripeReady={stripeReady}
                      hasCustomer={false}
                    />
                  }
                >
                  <ViewerPlanCta
                    planId={plan.id}
                    highlighted={!!plan.highlighted}
                    contactOnly={!!plan.contactOnly}
                    stripeReady={stripeReady}
                  />
                </Suspense>
              </div>
            </article>
          ))}
        </div>
        </BillingIntervalProvider>

        <section className="mt-16 max-w-2xl sm:mt-24" aria-labelledby="pricing-faq">
          <h2 id="pricing-faq" className="text-2xl font-semibold tracking-tight">
            FAQ
          </h2>
          <dl className="mt-8 divide-y divide-border border-y border-border">
            {faqs.map((faq) => (
              <div key={faq.q} className="py-5">
                <dt className="text-sm font-medium">{faq.q}</dt>
                <dd className="mt-2 text-sm text-muted leading-relaxed">
                  {faq.a}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}

function PlanCta({
  planId,
  highlighted,
  contactOnly,
  signedIn,
  currentPlan,
  stripeReady,
  hasCustomer,
}: {
  planId: PlanId;
  highlighted: boolean;
  contactOnly: boolean;
  signedIn: boolean;
  currentPlan: PlanId | null;
  stripeReady: boolean;
  hasCustomer: boolean;
}) {
  const variant = highlighted ? "default" : "secondary";

  if (contactOnly) {
    return (
      <Button asChild variant={variant} className="w-full min-h-10">
        <a href="mailto:hello@apidiffguard.com?subject=APIDiffGuard%20Team%20plan">
          Talk to us
        </a>
      </Button>
    );
  }

  if (signedIn && currentPlan === planId) {
    return (
      <Button className="w-full min-h-10" variant="secondary" disabled>
        Current plan
      </Button>
    );
  }

  if (signedIn && planId === "free") {
    return (
      <PortalButton
        className="w-full [&_button]:min-h-10 [&_button]:w-full"
        variant="secondary"
        label="Manage in billing"
        disabled={!stripeReady || !hasCustomer}
        disabledReason={
          !stripeReady
            ? "Stripe is not configured for this deployment yet."
            : !hasCustomer
              ? "No Stripe customer yet — upgrade once to manage billing."
              : undefined
        }
      />
    );
  }

  if (signedIn && isPaidPlan(planId)) {
    if (!stripeReady) {
      return (
        <Button asChild variant={variant} className="w-full min-h-10">
          <Link href="/settings/billing">Open billing</Link>
        </Button>
      );
    }
    return (
      <CheckoutButton
        plan={planId}
        label={`Upgrade to ${label(planId)}`}
        variant={variant}
      />
    );
  }

  return (
    <PlanStartLink
      planId={planId}
      variant={variant}
      label={planId === "free" ? "Start free" : `Start ${label(planId)}`}
    />
  );
}

function label(id: PlanId) {
  return id.charAt(0).toUpperCase() + id.slice(1);
}

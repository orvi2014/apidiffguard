import Link from "next/link";
import { Check } from "lucide-react";
import type { Metadata } from "next";
import { CheckoutButton, PortalButton } from "@/components/billing/stripe-actions";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/chrome";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { isPaidPlan, PLANS, type PlanId } from "@/lib/plans";
import { isStripeConfigured } from "@/lib/stripe/server";
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
    a: "Built-in defaults ignore volatile leaf names (request_id, timestamp, and similar). Custom workspace ignore rules exist in the engine but the console UI to edit them is still on the roadmap — review noisy paths in the Diff Viewer today.",
  },
  {
    q: "Is there a CLI?",
    a: "Yes. Use apidiff check from packages/cli in this repo (or npm link) to compare JSON files or a live URL and fail CI on breaking changes. Hosted endpoint login remains on the roadmap — see the CLI docs.",
  },
  {
    q: "What auth types are supported?",
    a: "Bearer, API key, Basic, OAuth token, and custom headers.",
  },
];

export default async function PricingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const ctx = user ? await getWorkspaceContext() : null;
  const currentPlan = ctx?.plan ?? null;
  const stripeReady = isStripeConfigured();
  const hasCustomer = Boolean(ctx?.stripeCustomerId);

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
          {currentPlan ? (
            <>
              {" "}
              Signed in as {ctx?.email} · current plan{" "}
              <strong className="font-medium text-foreground">
                {currentPlan}
              </strong>
              .
            </>
          ) : null}
        </p>

        <div className="mt-10 grid gap-3 sm:mt-14 sm:grid-cols-2 lg:grid-cols-4 lg:gap-px lg:overflow-hidden lg:rounded-lg lg:border lg:border-border lg:bg-border">
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
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-semibold tracking-tight">
                  {plan.priceLabel}
                </span>
                <span className="text-sm text-muted">{plan.period}</span>
              </div>
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
                <PlanCta
                  planId={plan.id}
                  highlighted={!!plan.highlighted}
                  contactOnly={!!plan.contactOnly}
                  signedIn={!!user}
                  currentPlan={currentPlan}
                  stripeReady={stripeReady}
                  hasCustomer={hasCustomer}
                />
              </div>
            </article>
          ))}
        </div>

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
    <Button asChild variant={variant} className="w-full min-h-10">
      <Link href={`/register?plan=${planId}&next=/settings/billing`}>
        {planId === "free" ? "Start free" : `Start ${label(planId)}`}
      </Link>
    </Button>
  );
}

function label(id: PlanId) {
  return id.charAt(0).toUpperCase() + id.slice(1);
}

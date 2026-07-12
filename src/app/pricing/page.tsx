import Link from "next/link";
import { Check } from "lucide-react";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/chrome";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "For trying the diff engine on a handful of endpoints.",
    features: ["3 endpoints", "Manual checks", "Baseline history", "Email alerts"],
    cta: "Start free",
    href: "/register",
    highlighted: false,
  },
  {
    name: "Starter",
    price: "$19",
    period: "/month",
    description: "Scheduled monitoring for small teams and side projects.",
    features: [
      "20 endpoints",
      "Scheduled checks",
      "Slack + email",
      "Ignore rules",
      "7-day alert history",
    ],
    cta: "Start Starter",
    href: "/register",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$49",
    period: "/month",
    description: "The plan most teams stay on once CI is wired up.",
    features: [
      "100 endpoints",
      "Unlimited baselines",
      "OpenAPI import",
      "CLI access",
      "Priority alerts",
      "Webhook channel",
    ],
    cta: "Start Pro",
    href: "/register",
    highlighted: true,
  },
  {
    name: "Team",
    price: "Custom",
    period: "",
    description: "Multi-workspace orgs with audit and role controls.",
    features: [
      "Unlimited endpoints",
      "Multiple workspaces",
      "RBAC",
      "Audit logs",
      "SSO (soon)",
      "Dedicated support",
    ],
    cta: "Talk to us",
    href: "mailto:hello@apidiffguard.com",
    highlighted: false,
  },
];

const faqs = [
  {
    q: "Is this just a JSON diff tool?",
    a: "No. APIDiffGuard monitors live endpoints, stores versioned baselines, schedules checks, and alerts on schema drift — the diff viewer is the signature surface, not the whole product.",
  },
  {
    q: "Can I ignore volatile fields?",
    a: "Yes. Ignore timestamps, UUIDs, request IDs, etags, and any custom JSON path per endpoint.",
  },
  {
    q: "Does the CLI use the same engine?",
    a: "Yes. apidiff check runs the same comparison logic and can fail CI on breaking severity.",
  },
  {
    q: "What auth types are supported?",
    a: "Bearer, API key, Basic, OAuth token, and custom headers.",
  },
];

export const metadata = {
  title: "Pricing",
};

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <main className="mx-auto max-w-6xl px-5 py-20">
        <h1 className="text-4xl font-semibold tracking-tight">Pricing</h1>
        <p className="mt-3 max-w-lg text-muted">
          Start free. Scale when monitoring becomes part of how you ship.
        </p>

        <div className="mt-14 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`flex flex-col bg-background p-6 ${
                plan.highlighted ? "bg-surface ring-1 ring-inset ring-accent/40" : ""
              }`}
            >
              <div className="text-sm font-medium text-muted">{plan.name}</div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-semibold tracking-tight">
                  {plan.price}
                </span>
                <span className="text-sm text-muted">{plan.period}</span>
              </div>
              <p className="mt-3 text-sm text-muted leading-relaxed">
                {plan.description}
              </p>
              <ul className="mt-6 flex-1 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-accent" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href={plan.href} className="mt-8 block">
                <Button
                  className="w-full"
                  variant={plan.highlighted ? "default" : "secondary"}
                >
                  {plan.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>

        <section className="mt-24 max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight">FAQ</h2>
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

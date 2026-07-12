import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Braces,
  Clock,
  GitCompare,
  Keyboard,
  Shield,
  Terminal,
  Webhook,
} from "lucide-react";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/chrome";
import { ProductDemo } from "@/components/marketing/product-demo";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import { BlurFade } from "@/components/ui/blur-fade";
import { ShineBorder } from "@/components/ui/shine-border";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { buildMetadata, faqJsonLd } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = buildMetadata({
  title: "API Breaking Change Detection & Schema Drift Monitoring",
  description:
    "Catch breaking API changes before production. Monitor responses, detect JSON schema drift, and gate CI with the same engine as our free JSON Diff tool.",
  path: "/",
});

const homeFaqs = [
  {
    q: "What is APIDiffGuard?",
    a: "APIDiffGuard monitors API responses against baselines, detects schema drift and breaking JSON changes, and helps teams catch contract breaks before production.",
  },
  {
    q: "Is there a free JSON Diff tool?",
    a: "Yes. The free JSON Diff, Formatter, and Validator tools work in the browser without an account. Hosted monitoring is available when you need schedules and alerts.",
  },
  {
    q: "Can I self-host?",
    a: "Yes. The project is open-core under MIT. You can self-host, or use APIDiffGuard Cloud so you do not operate auth, databases, and schedules yourself.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <JsonLd data={faqJsonLd(homeFaqs)} />
      <MarketingHeader />

      <main>
        <section className="relative overflow-hidden border-b border-border">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(79,127,255,0.15), transparent), linear-gradient(to right, transparent 0%, transparent calc(50% - 0.5px), rgba(39,39,42,0.5) 50%, transparent calc(50% + 0.5px), transparent 100%)",
            }}
          />
          <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-20 sm:pt-28">
            <BlurFade delay={0.05}>
              <AnimatedShinyText className="mb-6 inline-flex font-mono text-[11px] uppercase tracking-[0.2em] text-accent dark:text-accent">
                APIDiffGuard
              </AnimatedShinyText>
            </BlurFade>
            <BlurFade delay={0.1}>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl sm:leading-[1.08] lg:text-6xl">
                Catch breaking API changes before production.
              </h1>
            </BlurFade>
            <BlurFade delay={0.15}>
              <p className="mt-5 max-w-xl text-base text-muted leading-relaxed sm:text-lg">
                Monitor API responses, detect schema drift, compare JSON
                contracts, and alert your team before integrations break.
              </p>
            </BlurFade>
            <BlurFade delay={0.2} className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/register">
                <ShimmerButton
                  className="h-10 gap-2 rounded-lg px-5 text-sm font-medium shadow-none"
                  background="var(--primary)"
                  shimmerColor="#ffffff"
                  borderRadius="0.5rem"
                >
                  Start monitoring
                  <ArrowRight className="size-4" />
                </ShimmerButton>
              </Link>
              <Link href="/tools/json-diff">
                <Button size="lg" variant="secondary">
                  Free JSON Diff
                </Button>
              </Link>
            </BlurFade>
            <ProductDemo />
          </div>
        </section>

        <section id="features" className="border-b border-border">
          <div className="mx-auto max-w-6xl px-5 py-24">
            <BlurFade>
              <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
                Built around the diff — not another status board.
              </h2>
              <p className="mt-4 max-w-xl text-muted leading-relaxed">
                Capture baselines, schedule checks, and inspect every field change
                with the precision of an IDE.
              </p>
            </BlurFade>

            <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: GitCompare,
                  title: "Side-by-side response diff",
                  body: "Collapsible JSON trees, severity-coded changes, path search, and keyboard navigation.",
                },
                {
                  icon: Shield,
                  title: "Baselines you trust",
                  body: "Versioned snapshots of status, headers, and body. Approve, restore, and compare any pair.",
                },
                {
                  icon: Clock,
                  title: "Scheduled monitoring",
                  body: "Hourly to monthly checks with retries, backoff, timeouts, and rate limits.",
                },
                {
                  icon: Bell,
                  title: "Alerts that matter",
                  body: "Slack, Discord, email, and webhooks — filtered by severity so noise stays out.",
                },
                {
                  icon: Braces,
                  title: "OpenAPI import",
                  body: "Upload JSON or YAML, or paste a URL. Bulk-import endpoints in one pass.",
                },
                {
                  icon: Terminal,
                  title: "CLI & REST API",
                  body: "apidiff check in CI. Same engine as the console, authenticated with API tokens.",
                },
              ].map((f, i) => (
                <BlurFade key={f.title} delay={0.05 * i}>
                  <div className="relative h-full overflow-hidden rounded-lg border border-border bg-background p-6 sm:p-8">
                    <ShineBorder
                      shineColor={["#4F7FFF", "#22c55e", "#4F7FFF"]}
                      duration={12}
                      borderWidth={1}
                    />
                    <f.icon className="size-5 text-accent" strokeWidth={1.5} />
                    <h3 className="mt-4 text-base font-medium">{f.title}</h3>
                    <p className="mt-2 text-sm text-muted leading-relaxed">
                      {f.body}
                    </p>
                  </div>
                </BlurFade>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-border">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-24 lg:grid-cols-2">
            <BlurFade>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Same checks in CI and the console.
              </h2>
              <p className="mt-4 text-muted leading-relaxed">
                Gate deploys on schema drift. Fail the pipeline when a breaking
                change ships.
              </p>
              <Link
                href="/docs/cli"
                className="mt-6 inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
              >
                CLI documentation
                <ArrowRight className="size-3.5" />
              </Link>
            </BlurFade>
            <BlurFade delay={0.1}>
              <pre className="overflow-x-auto rounded-lg border border-border bg-surface p-5 font-mono text-[13px] leading-relaxed text-muted">
                <code>
                  <span className="text-muted-foreground">$</span>{" "}
                  <span className="text-foreground">npx apidiff check</span>
                  {"\n"}
                  <span className="text-success">✓</span> GET /v1/products — healthy
                  {"\n"}
                  <span className="text-warning">!</span> POST /v1/orders — 2 warnings
                  {"\n"}
                  <span className="text-danger">✗</span> GET /v1/users — 2 breaking
                  {"\n\n"}
                  <span className="text-muted-foreground">
                    Exit code 1 · see diff in console
                  </span>
                </code>
              </pre>
            </BlurFade>
          </div>
        </section>

        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-5 py-24">
            <h2 className="text-3xl font-semibold tracking-tight">
              Trusted by teams who ship APIs.
            </h2>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {[
                {
                  quote:
                    "We caught a renamed field in staging before mobile clients crashed. The side-by-side diff made the review trivial.",
                  name: "Priya N.",
                  role: "Staff Engineer, payments platform",
                },
                {
                  quote:
                    "Replaced a pile of ad-hoc curl scripts. Baselines plus Slack alerts are the only monitoring we actually look at.",
                  name: "Marcus T.",
                  role: "Platform lead, B2B SaaS",
                },
                {
                  quote:
                    "Agency life means dozens of client APIs. OpenAPI import and ignore rules saved us hours every sprint.",
                  name: "Elena R.",
                  role: "Integration engineer",
                },
              ].map((t) => (
                <blockquote key={t.name} className="space-y-4">
                  <p className="text-sm leading-relaxed text-muted">
                    “{t.quote}”
                  </p>
                  <footer>
                    <div className="text-sm font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-border">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-5 py-20 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <Keyboard className="mt-1 size-5 shrink-0 text-accent" strokeWidth={1.5} />
              <div>
                <h2 className="text-xl font-semibold tracking-tight">
                  Keyboard-first, like the tools you already live in.
                </h2>
                <p className="mt-1 text-sm text-muted">
                  ⌘K command palette · n / p jump between diffs · expand and
                  collapse trees without leaving the keys.
                </p>
              </div>
            </div>
            <Link href="/dashboard">
              <Button variant="secondary" className="gap-2">
                <Webhook className="size-4" />
                Open console
              </Button>
            </Link>
          </div>
        </section>

        <section className="border-b border-border">
          <div className="mx-auto max-w-3xl px-5 py-20">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Frequently asked questions
            </h2>
            <dl className="mt-8 divide-y divide-border border-y border-border">
              {homeFaqs.map((faq) => (
                <div key={faq.q} className="py-5">
                  <dt className="text-sm font-medium text-foreground">{faq.q}</dt>
                  <dd className="mt-2 text-sm text-muted leading-relaxed">
                    {faq.a}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-6xl px-5 py-24 text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Ship APIs with confidence.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-muted">
              Free for 3 endpoints. No credit card. Upgrade when monitoring
              becomes part of your release ritual.
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <Link href="/register">
                <ShimmerButton
                  className="h-10 rounded-lg px-5 text-sm font-medium shadow-none"
                  background="var(--primary)"
                  borderRadius="0.5rem"
                >
                  Start free
                </ShimmerButton>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="secondary">
                  View pricing
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}

import Link from "next/link";
import dynamic from "next/dynamic";
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
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import { ShineBorder } from "@/components/ui/shine-border";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { AnswerBlock } from "@/components/seo/answer-block";
import { buildMetadata, faqJsonLd, webPageSpeakableJsonLd } from "@/lib/seo";
import type { Metadata } from "next";

const ProductDemo = dynamic(
  () =>
    import("@/components/marketing/product-demo").then((m) => m.ProductDemo),
  {
    loading: () => (
      <div className="mx-auto mt-14 h-64 w-full max-w-5xl animate-pulse rounded-xl bg-surface" />
    ),
  }
);

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
    a: "Yes. The free JSON Diff, Formatter, and Validator tools work in the browser without an account. Monitoring live APIs over time is what APIDiffGuard productizes.",
  },
  {
    q: "Can I self-host?",
    a: "Yes. The project is open-core under MIT. You can self-host, or use APIDiffGuard Cloud so you do not operate auth, databases, and schedules yourself.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <JsonLd
        data={[
          faqJsonLd(homeFaqs),
          webPageSpeakableJsonLd("/", [".aeo-answer", "h1"]),
        ]}
      />
      <MarketingHeader />

      <main id="main">
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
            <AnimatedShinyText className="mb-6 inline-flex font-mono text-[11px] uppercase tracking-[0.2em] text-accent dark:text-accent">
              APIDiffGuard
            </AnimatedShinyText>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl sm:leading-[1.08] lg:text-6xl">
              Catch breaking API changes before production.
            </h1>
            <p className="aeo-answer mt-5 max-w-xl text-base text-muted leading-relaxed sm:text-lg">
              APIDiffGuard monitors live API responses against versioned
              baselines, detects JSON schema drift and breaking field changes,
              and helps teams catch contract breaks before production — with
              free JSON Diff tools in the browser.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
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
            </div>
            <ProductDemo />
          </div>
        </section>

        <section id="features" className="border-b border-border">
          <div className="mx-auto max-w-6xl px-5 py-24">
            <div>
              <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
                Built around the diff — not another status board.
              </h2>
              <p className="mt-4 max-w-xl text-muted leading-relaxed">
                Capture baselines, schedule checks, and inspect every field change
                with the precision of an IDE.
              </p>
            </div>

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
                  body: "Slack, Discord, and webhooks — filtered by severity so noise stays out.",
                },
                {
                  icon: Braces,
                  title: "OpenAPI import",
                  body: "Upload JSON or YAML, or paste a URL. Bulk-import endpoints in one pass.",
                },
                {
                  icon: Terminal,
                  title: "Console-first monitoring",
                  body: "Capture baselines and run checks in the console today. CLI and public API are on the roadmap.",
                },
              ].map((f) => (
                  <div key={f.title} className="relative h-full overflow-hidden rounded-lg border border-border bg-background p-6 sm:p-8">
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
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-border">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-24 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Same engine in the console — CI CLI coming soon.
              </h2>
              <p className="mt-4 text-muted leading-relaxed">
                Review schema drift in the Diff Viewer today. A published CLI
                for failing pipelines is on the roadmap.
              </p>
              <Link
                href="/docs/cli"
                className="mt-6 inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
              >
                CLI status
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
            <pre className="overflow-x-auto rounded-lg border border-border bg-surface p-5 font-mono text-[13px] leading-relaxed text-muted">
              <code>
                <span className="text-muted-foreground"># Console · Run check</span>
                {"\n"}
                <span className="text-success">✓</span> GET /v1/products — healthy
                {"\n"}
                <span className="text-warning">!</span> POST /v1/orders — 2 warnings
                {"\n"}
                <span className="text-danger">✗</span> GET /v1/users — 2 breaking
                {"\n\n"}
                <span className="text-muted-foreground">
                  Open the Diff Viewer to review field changes
                </span>
              </code>
            </pre>
          </div>
        </section>

        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-5 py-24">
            <h2 className="text-3xl font-semibold tracking-tight">
              Built for teams that ship APIs.
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-muted leading-relaxed">
              APIDiffGuard is early — we are dogfooding it on our own APIs and
              iterating from that feedback. Want to share a use case?{" "}
              <a
                href="mailto:hello@apidiffguard.com"
                className="text-foreground underline-offset-4 hover:underline"
              >
                hello@apidiffguard.com
              </a>
            </p>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {[
                {
                  title: "Baseline → check → diff",
                  body: "Capture a known-good response, re-fetch on a schedule or in CI, and review every field change with severity.",
                },
                {
                  title: "Alert when it matters",
                  body: "Route breaking changes to Slack, Discord, or a webhook instead of burying them in log noise.",
                },
                {
                  title: "Same engine as free tools",
                  body: "The browser JSON Diff, Formatter, and Validator use the same comparison engine as the monitored console.",
                },
              ].map((item) => (
                <div key={item.title} className="space-y-3">
                  <h3 className="text-sm font-medium">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-muted">
                    {item.body}
                  </p>
                </div>
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
                  ⌘K command palette · n / p jump between changes in a diff.
                </p>
              </div>
            </div>
            <Link href="/login?next=/dashboard">
              <Button variant="secondary" className="gap-2">
                <Webhook className="size-4" />
                Open console
              </Button>
            </Link>
          </div>
        </section>

        <section className="border-b border-border">
          <div className="mx-auto max-w-3xl space-y-12 px-5 py-20">
            <AnswerBlock
              question="What is schema drift in APIs?"
              answer="Schema drift is when a live API response changes shape over time — fields disappear, types change, or status classes flip — without your clients being ready. APIDiffGuard detects that by comparing each check to a stored baseline and classifying changes by severity."
            />
            <AnswerBlock
              question="How do you detect breaking API changes in CI?"
              answer="Capture a known-good response as a baseline, re-fetch the same endpoint in CI, and fail the job when the JSON diff reports breaking severity such as removed fields or type changes. APIDiffGuard uses the same engine in the console and in the free JSON Diff tool."
            />
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

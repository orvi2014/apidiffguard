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
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { AnswerBlock } from "@/components/seo/answer-block";
import { buildMetadata, faqJsonLd, webPageSpeakableJsonLd } from "@/lib/seo";
import type { Metadata } from "next";
import type React from "react";

export const metadata: Metadata = buildMetadata({
  title: "API Breaking Change Detection & Schema Drift Monitoring",
  description:
    "Catch breaking API changes before production. Monitor responses, detect JSON schema drift, and review diffs with the same engine as our free JSON Diff tool.",
  path: "/",
});

const homeFaqs = [
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
          <div className="relative mx-auto max-w-6xl px-5 pb-24 pt-24 sm:pt-32">
            {/* Centered, oversized, light-weight display type over a frameless
                hairline ledger. Instrument Sans bottoms out at 400, so the
                "light at scale" read comes from weight 400 plus tight tracking
                rather than the 350 the reference uses. */}
            {/* max-w-5xl so the line lands in two on desktop; 2rem on mobile
                keeps the longest word off the 20px gutter. */}
            <h1 className="mx-auto max-w-5xl text-center text-[2rem] font-normal leading-[1.06] tracking-[-0.03em] text-foreground sm:text-5xl lg:text-[4.5rem] lg:leading-[1.02] lg:tracking-[-0.035em]">
              Catch breaking API changes before production.
            </h1>
            <p className="aeo-answer mx-auto mt-7 max-w-2xl text-center text-[15px] text-muted leading-relaxed sm:mt-8 sm:text-lg">
              APIDiffGuard monitors live API responses against versioned
              baselines, detects JSON schema drift and breaking field changes,
              and helps teams catch contract breaks before production — with
              free JSON Diff tools in the browser.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3 sm:mt-10">
              <Link href="/register">
                <span className="group inline-flex h-11 items-center gap-2 rounded-md bg-foreground px-6 text-sm font-medium text-background transition-opacity hover:opacity-90">
                  Start free
                  <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </span>
              </Link>
              <Link href="/tools/json-diff">
                <span className="inline-flex h-11 items-center rounded-md border border-border px-6 text-sm font-medium text-foreground transition-colors hover:border-[#3f3f46] hover:bg-surface">
                  Free JSON Diff
                </span>
              </Link>
            </div>
            {/* The page's whole trust argument, at the point of commitment
                rather than 7,000px down. Every clause is verifiable. */}
            <p className="mx-auto mt-5 max-w-2xl text-center text-sm text-muted">
              Free for 3 endpoints · no credit card ·{" "}
              <a
                href="https://github.com/orvi2014/apidiffguard"
                className="underline underline-offset-4 transition-colors hover:text-foreground"
              >
                MIT open source
              </a>
            </p>
            <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-muted">
              Cloud reaches public endpoints only. Behind a VPN?{" "}
              <Link
                href="/docs"
                className="underline underline-offset-4 transition-colors hover:text-foreground"
              >
                Self-host it
              </Link>{" "}
              — same features, MIT.
            </p>

            {/* The readout, unframed: hairlines only, label left, value right. */}
            <div className="mx-auto mt-16 max-w-3xl sm:mt-24">
              <div
                className="ledger-row flex items-baseline justify-between border-t border-foreground pb-4 pt-4 font-mono text-[13px]"
                style={{ "--row": 0 } as React.CSSProperties}
              >
                <span className="text-muted">GET /v1/users</span>
                {/* Naming the mode turns the absence of value churn from a
                    gap into the product's actual differentiator. */}
                <span className="text-muted">
                  baseline v4 · mode <span className="text-foreground">schema</span>
                </span>
              </div>
              {[
                // Every row here is a change the engine actually reports in
                // schema mode, at the severity severityFor() actually assigns:
                // removed and type_changed are breaking, header_changed is
                // warning, added falls through to info. Leaf value churn is
                // absent on purpose — schema mode drops it before it becomes a
                // change at all, which is the whole point of the default.
                {
                  path: "data.name",
                  change: "removed",
                  tone: "text-danger",
                  label: "breaking",
                },
                {
                  path: "data.id",
                  change: "number → string",
                  tone: "text-danger",
                  label: "breaking",
                },
                {
                  path: "$header.cache-control",
                  change: "no-cache → max-age=60",
                  tone: "text-warning",
                  label: "warning",
                },
                {
                  path: "data.full_name",
                  change: "added",
                  tone: "text-info",
                  label: "info",
                },
              ].map((row, i) => (
                <div
                  key={row.path}
                  className="ledger-row flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t border-border-subtle py-4 font-mono text-[13px]"
                  style={{ "--row": i + 1 } as React.CSSProperties}
                >
                  <span className="text-foreground">{row.path}</span>
                  <span className="flex items-baseline gap-4">
                    <span className="text-muted">{row.change}</span>
                    <span
                      className={`ledger-verdict ${row.tone} w-[68px] text-right`}
                      style={{ "--row": i + 1 } as React.CSSProperties}
                    >
                      {row.label}
                    </span>
                  </span>
                </div>
              ))}
              <div
                className="ledger-row flex items-baseline justify-between border-t border-border-subtle pt-4 font-mono text-[13px]"
                style={{ "--row": 5 } as React.CSSProperties}
              >
                <span className="text-muted">verdict</span>
                <span
                  className="ledger-verdict text-danger"
                  style={{ "--row": 5 } as React.CSSProperties}
                >
                  2 breaking · 1 warning
                </span>
              </div>
            </div>

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
                  body: "Hourly to monthly cadence with request timeouts. Failed runs requeue on the next cron pass.",
                },
                {
                  icon: Bell,
                  title: "Alerts that matter",
                  body: "Slack, Discord, Mattermost, email, and webhooks — filtered by severity so noise stays out.",
                },
                {
                  icon: Braces,
                  title: "OpenAPI import",
                  body: "Upload JSON or YAML, or paste a URL. Bulk-import endpoints in one pass.",
                },
                {
                  icon: Terminal,
                  title: "CLI for CI",
                  body: "apidiff check diffs JSON files or a live URL and exits non-zero on breaking changes.",
                },
              ].map((f) => (
                  <div key={f.title} className="relative h-full overflow-hidden rounded-lg border border-border bg-background p-6 sm:p-8">
                    <f.icon className="size-5 text-muted-foreground" strokeWidth={1.5} />
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
          <div className="mx-auto max-w-6xl px-5 py-24">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Same engine in the console and in CI.
              </h2>
              <p className="mt-4 text-muted leading-relaxed">
                Review schema drift in the Diff Viewer, or run{" "}
                <code className="text-sm text-foreground">apidiff check</code>{" "}
                in your pipeline against a baseline file or live URL.
              </p>
              <Link
                href="/docs/cli"
                className="mt-6 inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
              >
                CLI docs
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
            <div className="mt-12 grid gap-6 lg:grid-cols-2">
              {/* The console half: the side-by-side panes the copy promises and
                  the hero ledger deliberately does not show. Flat per the
                  Flat Ground Rule — tone and hairlines, no shadow. */}
              <div className="overflow-hidden rounded-lg border border-border bg-surface">
                <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle px-4 py-2.5 text-xs text-muted">
                  <span>Diff Viewer</span>
                  <span aria-hidden className="h-3 w-px bg-border" />
                  <span className="font-mono text-foreground">users · v4 → live</span>
                  <span className="ml-auto font-mono text-danger">2 breaking</span>
                </div>
                <div className="grid sm:grid-cols-2 sm:divide-x sm:divide-border-subtle">
                  <div className="border-b border-border-subtle sm:border-b-0">
                    <div className="border-b border-border-subtle px-3 py-1.5 font-mono text-xs text-muted">
                      baseline v4
                    </div>
                    <pre className="overflow-x-auto bg-background p-3 font-mono text-[13px] leading-6 text-muted">
                      <code>
                        {"  {\n    \"data\": {\n"}
                        <span className="bg-danger-muted text-danger">
                          {"-     \"name\": \"Alex Rivera\","}
                        </span>
                        {"\n"}
                        <span className="bg-danger-muted text-danger">
                          {"-     \"id\": 4021"}
                        </span>
                        {"\n    }\n  }"}
                      </code>
                    </pre>
                  </div>
                  <div>
                    <div className="border-b border-border-subtle px-3 py-1.5 font-mono text-xs text-muted">
                      live
                    </div>
                    <pre className="overflow-x-auto bg-background p-3 font-mono text-[13px] leading-6 text-muted">
                      <code>
                        {"  {\n    \"data\": {\n"}
                        <span className="bg-danger-muted text-danger">
                          {"+     \"id\": \"4021\","}
                        </span>
                        {"\n"}
                        <span className="bg-info-muted text-info">
                          {"+     \"full_name\": \"Alex Rivera\""}
                        </span>
                        {"\n    }\n  }"}
                      </code>
                    </pre>
                  </div>
                </div>
              </div>

              <pre className="overflow-x-auto rounded-lg border border-border bg-background p-5 font-mono text-[13px] leading-relaxed text-muted">
              <code>
                <span className="text-muted-foreground">
                  $ apidiff check --baseline users.json --url $API/users
                </span>
                {"\n"}
                breaking=2 warning=1 info=0
                {"\n"}
                <span className="text-danger">BREAKING</span> removed{" "}
                data.email
                {"\n"}
                <span className="text-danger">BREAKING</span> type_changed{" "}
                data.id
                {"\n"}
                <span className="text-warning">WARNING</span> changed{" "}
                data.role
                {"\n\n"}
                <span className="text-danger">
                  Failed: 2 change(s) at or above breaking.
                </span>
                </code>
              </pre>
            </div>
          </div>
        </section>

        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-5 py-24">
            <h2 className="text-3xl font-semibold tracking-tight">
              Open source, and early.
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
                  body: "Capture a known-good response, re-fetch on a schedule or manually in the console, and review every field change with severity.",
                },
                {
                  title: "Alert when it matters",
                  body: "Route breaking changes to Slack, Discord, Mattermost, or a webhook instead of burying them in log noise.",
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
              <Keyboard className="mt-1 size-5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
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
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Frequently asked questions
            </h2>
            <AnswerBlock
              question="What is schema drift in APIs?"
              answer="Schema drift is when a live API response changes shape over time — fields disappear, types change, or status classes flip — without your clients being ready. APIDiffGuard detects that by comparing each check to a stored baseline and classifying changes by severity."
            />
            <AnswerBlock
              question="How do you detect breaking API changes in CI?"
              answer="Capture a known-good response as a baseline, re-fetch the same endpoint (or compare JSON fixtures), and fail the job when the JSON diff reports breaking severity. Use apidiff check from @apidiffguard/cli, the console Diff Viewer, or the free JSON Diff tool — they share the same engine."
            />
            <dl className="divide-y divide-border border-y border-border">
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
                <span className="inline-flex h-11 items-center gap-2 rounded-md bg-foreground px-6 text-sm font-medium text-background transition-opacity hover:opacity-90">
                  Start free
                  <ArrowRight className="size-4" />
                </span>
              </Link>
              <Link href="/pricing">
                <span className="inline-flex h-11 items-center rounded-md border border-border px-6 text-sm font-medium text-foreground transition-colors hover:border-[#3f3f46] hover:bg-surface">
                  View pricing
                </span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}

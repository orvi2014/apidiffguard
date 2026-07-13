import type { Metadata } from "next";
import Link from "next/link";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/chrome";
import { AnswerBlock } from "@/components/seo/answer-block";
import { JsonLd } from "@/components/seo/json-ld";
import {
  buildMetadata,
  definedTermJsonLd,
  faqJsonLd,
  howToJsonLd,
  webPageSpeakableJsonLd,
} from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "About APIDiffGuard — API Schema Drift & Breaking Change Monitoring",
  description:
    "APIDiffGuard is open-core developer tooling that baselines API responses, diffs JSON contracts, and detects schema drift before production. Free JSON Diff tools included.",
  path: "/about",
});

const faqs = [
  {
    q: "What is APIDiffGuard?",
    a: "APIDiffGuard is developer software that monitors live API responses against versioned baselines, detects JSON schema drift and breaking field changes, and helps teams catch contract breaks before production. It also offers free browser JSON Diff tools.",
  },
  {
    q: "Who is APIDiffGuard for?",
    a: "Backend and platform engineers, agencies integrating partner APIs such as Stripe, and teams that want scheduled response-contract checks instead of ad-hoc curl scripts.",
  },
  {
    q: "How is APIDiffGuard different from uptime monitoring?",
    a: "Uptime tools usually check HTTP status. APIDiffGuard compares response shape — removed fields, type changes, and status class flips — so you catch silent contract breaks, not just downtime.",
  },
];

const terms = [
  {
    name: "Schema drift",
    description:
      "Unplanned change in an API response structure over time, such as removed fields, type changes, or new required properties that break clients.",
    path: "/docs/concepts",
  },
  {
    name: "API baseline",
    description:
      "A versioned snapshot of a known-good API response (status, headers, body) used as the contract to compare future checks against.",
    path: "/docs/concepts",
  },
  {
    name: "Breaking API change",
    description:
      "A response change that is likely to break clients — for example a removed field, a type change, or an HTTP status class change from success to error.",
    path: "/blog/detect-breaking-api-changes-in-ci",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <JsonLd
        data={[
          faqJsonLd(faqs),
          ...definedTermJsonLd(terms),
          howToJsonLd({
            name: "How to detect breaking API changes with APIDiffGuard",
            description:
              "Capture a baseline, run checks, and alert on breaking severity.",
            path: "/about",
            steps: [
              {
                name: "Register an endpoint",
                text: "Add the URL and method you care about, or import from OpenAPI.",
              },
              {
                name: "Capture a baseline",
                text: "Fetch the live response while it is known-good and store it as the active baseline.",
              },
              {
                name: "Run a check",
                text: "Re-fetch the endpoint and diff the body and status against the baseline.",
              },
              {
                name: "Alert on breaking changes",
                text: "Route Slack, Discord, or webhook alerts when severity includes breaking changes such as removed fields or type changes.",
              },
            ],
          }),
          webPageSpeakableJsonLd("/about", [".aeo-answer", "h1"]),
        ]}
      />
      <MarketingHeader />
      <main id="main" className="mx-auto max-w-3xl px-5 py-16">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">
          About
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          What is APIDiffGuard?
        </h1>
        <p className="aeo-answer mt-4 text-lg leading-relaxed text-muted-foreground">
          APIDiffGuard monitors live API responses against versioned baselines,
          detects JSON schema drift and breaking field changes, and helps teams
          catch contract breaks before production. Free JSON Diff, Formatter,
          and Validator tools run in the browser without an account; Cloud hosts
          baselines and checks for you.
        </p>

        <div className="mt-14 space-y-12">
          <AnswerBlock
            question="What problem does it solve?"
            answer="Partner and internal APIs change shape without warning. Unit tests of your code miss those breaks. APIDiffGuard replaces ad-hoc curl scripts with baselines, scheduled checks, and a severity-aware JSON diff so teams see removed fields and type changes before customers do."
          />
          <AnswerBlock
            question="How does API monitoring differ from a JSON Diff?"
            answer="A JSON Diff compares two static payloads once. APIDiffGuard stores a baseline from a live endpoint, re-fetches on demand or on a schedule, and alerts when the live response drifts. The free Diff tool uses the same comparison engine for one-off investigations."
          >
            <p className="mt-3 text-sm">
              Try the{" "}
              <Link href="/tools/json-diff" className="text-accent hover:underline">
                free JSON Diff
              </Link>{" "}
              or read{" "}
              <Link href="/docs/concepts" className="text-accent hover:underline">
                concepts
              </Link>
              .
            </p>
          </AnswerBlock>
          <AnswerBlock
            question="Is APIDiffGuard open source?"
            answer="Yes. The repository is MIT open-core. You can self-host and use the free browser tools. The diff engine package lives in-repo under packages/diff-engine (not published to npm yet). Cloud is hosted convenience — auth, workspaces, and managed monitoring."
          >
            <p className="mt-3 text-sm">
              <a
                href="https://github.com/orvi2014/apidiffguard"
                className="text-accent hover:underline"
              >
                github.com/orvi2014/apidiffguard
              </a>
            </p>
          </AnswerBlock>
        </div>

        <section className="mt-14">
          <h2 className="text-xl font-semibold tracking-tight">Key terms</h2>
          <dl className="mt-6 divide-y divide-border border-y border-border">
            {terms.map((term) => (
              <div key={term.name} className="py-4">
                <dt className="text-sm font-medium text-foreground">
                  <Link href={term.path!} className="hover:text-accent">
                    {term.name}
                  </Link>
                </dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {term.description}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-14">
          <h2 className="text-xl font-semibold tracking-tight">FAQ</h2>
          <dl className="mt-6 divide-y divide-border border-y border-border">
            {faqs.map((faq) => (
              <div key={faq.q} className="py-4">
                <dt className="text-sm font-medium">{faq.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {faq.a}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <p className="mt-12 text-sm text-muted-foreground">
          Machine-readable map:{" "}
          <Link href="/llms.txt" className="text-accent hover:underline">
            llms.txt
          </Link>{" "}
          ·{" "}
          <Link href="/llms-full.txt" className="text-accent hover:underline">
            llms-full.txt
          </Link>
        </p>
      </main>
      <MarketingFooter />
    </div>
  );
}

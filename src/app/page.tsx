import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/chrome";
import { BrandLogo } from "@/components/brand/logo";
import { CheckConsole } from "@/components/marketing/landing/check-console";
import { CopyCommand } from "@/components/marketing/landing/copy-command";
import { SetupTabs } from "@/components/marketing/landing/setup-tabs";
import {
  AlertFigure,
  BaselinesFigure,
  DiffFigure,
} from "@/components/marketing/landing/figures";
import { JsonLd } from "@/components/seo/json-ld";
import { buildMetadata, faqJsonLd, webPageSpeakableJsonLd } from "@/lib/seo";
import { loadChangelog } from "@/lib/changelog";
import { PLANS, planAllowsSchedules } from "@/lib/plans";
import type { Metadata } from "next";
import type { ReactNode } from "react";

// The layout's title template doesn't apply to the root page, so the brand is
// spelled out. Kept under ~55 characters; "breaking change detection" is
// carried by the H1 instead.
export const metadata: Metadata = buildMetadata({
  title: "APIDiffGuard: Third-Party API Change Monitoring",
  description:
    "Monitor third-party API responses and catch breaking changes like removed fields, type flips and new nulls, even behind a 200 OK. MIT open source, CLI and cloud.",
  path: "/",
});

const GITHUB_URL = "https://github.com/orvi2014/apidiffguard";

/*
 * Every answer here is rendered on the page and emitted as FAQPage JSON-LD, so
 * what an answer engine quotes and what a visitor reads are the same words.
 * Each one is checked against the product: severities against severityFor(),
 * default ignores against IGNORE_DEFAULTS, cadence against FREQUENCIES.
 */
const faqs = [
  {
    q: "What is APIDiffGuard?",
    a: "APIDiffGuard is an open-source (MIT) tool that monitors the live responses of the APIs you depend on. It compares each response to a saved baseline and flags breaking changes such as removed fields, type changes, values that became null, and status-class flips. It runs as a hosted cloud service, a self-hosted app, or a CLI in CI.",
  },
  {
    q: "How is this different from uptime monitoring?",
    a: "Uptime monitors check that an API answered, usually by status code and latency. APIDiffGuard checks what it answered: it diffs the body, status and headers against a baseline, so a 200 OK with a renamed or missing field is reported as a breaking change instead of a green check.",
  },
  {
    q: "How is APIDiffGuard different from oasdiff and other OpenAPI diff tools?",
    a: "OpenAPI diff tools such as oasdiff compare two spec files, so they only help when a provider publishes an accurate spec. APIDiffGuard compares the responses an API actually returns, which catches drift in vendors with no spec, or a spec that no longer matches production. OpenAPI import is still there to register endpoints in bulk.",
  },
  {
    q: "How do you detect breaking API changes in CI?",
    a: "Save a known-good response as a baseline file, then run npx @apidiffguard/cli check --baseline <file> --url <endpoint> --schema-only --fail-on breaking in your pipeline. The command exits non-zero when a breaking change is found, which fails the job. It works in GitHub Actions or any CI that runs Node.",
  },
  {
    q: "What is schema drift in APIs?",
    a: "Schema drift is when a live API response changes shape over time — fields disappear, types change, values become null, or status classes flip — without your client code being ready. It usually ships without a version bump, which is why it reaches production unnoticed.",
  },
  {
    q: "Will timestamps and request IDs trigger alerts?",
    a: "No. Schema mode ignores leaf value changes, and fields such as request_id, timestamp, created_at, updated_at and etag are ignored by default. Ignore rules on each endpoint cover anything else that changes on every call.",
  },
  {
    q: "Can I self-host APIDiffGuard?",
    a: "Yes. Every line is MIT-licensed. Self-hosting is the way to monitor APIs behind a VPN, because APIDiffGuard Cloud only reaches public endpoints. The self-hosting guide covers the database, environment variables, the encryption key and the two scheduled workers.",
  },
];

const breakingRules = [
  { sign: "−", change: "field removed", label: "breaking", tone: "text-danger" },
  { sign: "~", change: "type changed", label: "breaking", tone: "text-danger" },
  { sign: "~", change: "value became null", label: "breaking", tone: "text-danger" },
  { sign: "~", change: "status class changed (2xx → 4xx)", label: "breaking", tone: "text-danger" },
  { sign: "~", change: "header changed", label: "warning", tone: "text-warning" },
  { sign: "+", change: "field added", label: "info", tone: "text-info" },
];

const howItWorks = [
  {
    Figure: BaselinesFigure,
    fig: "FIG 0.1",
    title: "Baselines, versioned",
    body: "A known-good response per endpoint, with headers and status. Restore one, or compare any two versions.",
  },
  {
    Figure: DiffFigure,
    fig: "FIG 0.2",
    title: "A diff that grades itself",
    body: "Removed fields, type flips and new nulls are breaking. Schema mode ignores value churn, so a changed timestamp is never drift.",
  },
  {
    Figure: AlertFigure,
    fig: "FIG 0.3",
    title: "Alerts that don't cry wolf",
    body: "A severity threshold per channel, and repeats of the same break held back until something new changes.",
  },
];

/** The bold lead of each changelog bullet, e.g. "**Yearly billing.** …". */
function recentShips(limit: number) {
  const latest = loadChangelog()[0];
  if (!latest) return [];
  const label = latest.date ? `${latest.version} · ${latest.date}` : latest.version;
  return latest.items
    .map((item) => item.match(/^\*\*(.+?)\*\*/)?.[1]?.replace(/\.$/, ""))
    .filter((title): title is string => !!title)
    .slice(0, limit)
    .map((title) => ({ title, label }));
}

function PrimaryCta({ children }: { children: ReactNode }) {
  return (
    <Link
      href="/register"
      className="group inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-5 text-[14.5px] font-medium text-background transition-[transform,background-color] duration-300 ease-[var(--ease-settle)] hover:-translate-y-px hover:bg-white active:scale-[0.98]"
    >
      {children}
      <ArrowRight
        aria-hidden
        className="size-4 transition-transform duration-300 ease-[var(--ease-settle)] group-hover:translate-x-0.5"
      />
    </Link>
  );
}

function GhostCta({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex h-11 items-center rounded-full border border-white/15 px-5 text-[14.5px] font-medium text-foreground/90 transition-colors hover:border-white/30 hover:text-foreground"
    >
      {children}
    </a>
  );
}

function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`font-mono text-xs tracking-[0.02em] text-muted-foreground/70 ${className}`}>
      {children}
    </p>
  );
}

const sectionTitle =
  "landing-reveal max-w-3xl text-balance text-[clamp(2rem,4.2vw,3.25rem)] font-semibold leading-[1.04] tracking-[-0.04em]";

export default function LandingPage() {
  const ships = recentShips(4);

  return (
    <div className="min-h-screen overflow-x-clip">
      <JsonLd
        data={[
          faqJsonLd(faqs),
          webPageSpeakableJsonLd("/", [".aeo-answer", "h1"]),
        ]}
      />
      <MarketingHeader />

      <main id="main">
        {/* Hero */}
        <section className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[420px] h-[700px] w-[1100px] max-w-[200vw] -translate-x-1/2 bg-[radial-gradient(ellipse_50%_50%_at_50%_50%,rgba(79,127,255,0.18),transparent_70%)]"
          />
          <div className="relative mx-auto max-w-6xl px-4 pt-16 sm:px-5 sm:pt-24">
            {/* The eyebrow is part of the H1 so the heading carries the search
                terms while the display line carries the argument. */}
            <h1>
              <span className="landing-rise block font-mono text-xs font-normal tracking-[0.02em] text-muted-foreground/70">
                Breaking-change detection for third-party APIs
              </span>
              <span
                className="landing-rise mt-5 block max-w-5xl text-[clamp(2.4rem,6vw,4.6rem)] font-semibold leading-[0.98] tracking-[-0.05em]"
                style={{ animationDelay: "120ms" }}
              >
                Third-party APIs change.
                <br />
                <span className="text-muted-foreground/60">Know before your users do.</span>
              </span>
            </h1>
            <p
              className="aeo-answer landing-rise mt-6 max-w-xl text-lg leading-relaxed text-muted"
              style={{ animationDelay: "220ms" }}
            >
              APIDiffGuard checks the live responses of the APIs you call and flags
              breaking field changes, even behind a 200 OK.
            </p>
            <div
              className="landing-rise mt-8 flex flex-wrap items-center gap-3"
              style={{ animationDelay: "320ms" }}
            >
              <PrimaryCta>Start free</PrimaryCta>
              <CopyCommand command="npx @apidiffguard/cli check" />
            </div>
            {/* The trust argument at the point of commitment. Every clause is
                verifiable, and the VPN limit is stated rather than discovered. */}
            <p
              className="landing-rise mt-5 text-sm text-muted"
              style={{ animationDelay: "380ms" }}
            >
              Free for 3 endpoints · no credit card ·{" "}
              <a href={GITHUB_URL} className="underline underline-offset-4 hover:text-foreground">
                MIT open source
              </a>
              . Behind a VPN?{" "}
              <Link href="/docs/self-hosting" className="underline underline-offset-4 hover:text-foreground">
                Self-host it
              </Link>
              .
            </p>
          </div>

          <div className="relative mx-auto mt-14 max-w-6xl px-4 sm:mt-16 sm:px-5">
            <div className="mb-3 flex flex-wrap justify-between gap-x-5 gap-y-2">
              <Eyebrow>fig. 1 — a scheduled check catching a vendor change</Eyebrow>
              <p className="flex gap-4 font-mono text-xs">
                <span className="text-danger">− removed</span>
                <span className="text-warning">~ changed</span>
                <span className="text-info">+ added</span>
              </p>
            </div>
            <div className="landing-tilt">
              <CheckConsole />
            </div>
          </div>
        </section>

        {/* Integrations */}
        <section className="mx-auto mt-16 max-w-6xl px-4 sm:mt-[72px] sm:px-5">
          <div className="flex flex-wrap items-center gap-x-10 gap-y-3.5 border-t border-white/[0.07] py-6 font-mono text-[13.5px] text-muted">
            <span className="text-xs text-muted-foreground/70">Works with</span>
            {["GitHub Actions", "OpenAPI 3", "Slack", "Discord", "Mattermost", "Email", "Webhooks"].map(
              (name) => (
                <span key={name}>{name}</span>
              )
            )}
          </div>
        </section>

        {/* The contrast */}
        <section className="mx-auto max-w-6xl px-4 py-24 sm:px-5 sm:py-28">
          <h2 className="max-w-5xl text-[clamp(1.6rem,3.4vw,2.6rem)] font-semibold leading-[1.18] tracking-[-0.035em] text-muted-foreground/40">
            <span className="landing-lit">Your uptime monitor says 200 OK.</span>{" "}
            <span className="landing-lit">The response is missing a field your code reads.</span>{" "}
            <span>Uptime checks that an API answered. APIDiffGuard checks what it said.</span>
          </h2>
        </section>

        {/* How it works */}
        <section id="how" aria-label="How it works" className="mx-auto max-w-6xl px-4 sm:px-5">
          <div className="grid border-t border-white/[0.07] md:grid-cols-3">
            {howItWorks.map(({ Figure, fig, title, body }, i) => (
              <div
                key={title}
                className={`pb-2 pt-7 ${
                  i > 0 ? "border-t border-white/[0.07] md:border-l md:border-t-0 md:pl-7" : ""
                } md:pr-7`}
              >
                <Figure />
                <Eyebrow className="mt-4">{fig}</Eyebrow>
                <h3 className="mt-2 text-[17px] font-semibold tracking-[-0.02em]">{title}</h3>
                <p className="mt-1.5 max-w-xs text-[14.5px] leading-relaxed text-muted">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Setup */}
        <section id="setup" className="mx-auto max-w-6xl px-4 pt-28 sm:px-5 sm:pt-36">
          <h2 className={sectionTitle}>Five minutes to your first check.</h2>
          <p className="landing-reveal mt-4 max-w-xl text-[16.5px] leading-relaxed text-muted">
            Run it from your terminal, gate a pull request, call it from your own
            code, or hand the setup to your coding agent. No account needed for the{" "}
            <Link href="/tools/json-diff" className="text-foreground underline underline-offset-4">
              free JSON Diff
            </Link>{" "}
            or the{" "}
            <Link href="/docs/cli" className="text-foreground underline underline-offset-4">
              CLI
            </Link>
            .
          </p>
          <div className="landing-reveal mt-10">
            <SetupTabs />
          </div>
        </section>

        {/* What counts as breaking + security */}
        <section className="mx-auto max-w-6xl px-4 pt-28 sm:px-5 sm:pt-36">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="landing-reveal rounded-2xl border border-border bg-[radial-gradient(ellipse_70%_60%_at_0%_0%,rgba(79,127,255,0.10),transparent_60%)] bg-surface p-8">
              <h2 className="font-mono text-xs font-normal text-muted-foreground/70">
                What counts as breaking
              </h2>
              <table className="mt-5 w-full font-mono text-[13.5px] leading-[2.3]">
                <caption className="sr-only">How each kind of response change is graded</caption>
                <tbody>
                  {breakingRules.map((r) => (
                    <tr key={r.change}>
                      <th scope="row" className="text-left font-normal">
                        <span className={r.tone}>{r.sign}</span>
                        {"  "}
                        {r.change}
                      </th>
                      <td className={`text-right ${r.tone}`}>{r.label}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="landing-reveal flex flex-col justify-between gap-7 rounded-2xl border border-border bg-surface p-8">
              <div>
                <Eyebrow>What we store, and how</Eyebrow>
                <h2 className="mt-3.5 text-[22px] font-semibold tracking-[-0.03em]">
                  Built for APIs with credentials.
                </h2>
              </div>
              <ul className="grid gap-3.5 text-[14.5px] text-foreground/85">
                {[
                  "Endpoint credentials sealed with AES-256-GCM. Replaceable, never readable back, not even by owners.",
                  "Outbound requests refuse private and loopback addresses, and credentials drop when a redirect changes origin.",
                  "Bodies capped at 2 MB, old responses trimmed on a schedule.",
                ].map((line) => (
                  <li key={line} className="flex gap-3">
                    <span aria-hidden className="font-mono text-accent">+</span>
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Changelog */}
        {ships.length > 0 && (
          <section id="changelog" className="mx-auto max-w-6xl px-4 pt-28 sm:px-5 sm:pt-36">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className={sectionTitle}>Shipping in the open.</h2>
              <Link href="/changelog" className="font-mono text-xs text-muted hover:text-foreground">
                Full changelog →
              </Link>
            </div>
            <ul className="landing-reveal mt-9 grid overflow-hidden rounded-2xl border border-border bg-surface sm:grid-cols-2 lg:grid-cols-4">
              {ships.map((ship, i) => (
                <li
                  key={ship.title}
                  className={`p-6 ${i > 0 ? "border-t border-white/[0.07]" : ""} ${
                    i === 1 ? "sm:border-l sm:border-t-0" : ""
                  } ${i === 2 ? "lg:border-l lg:border-t-0" : ""} ${i === 3 ? "sm:border-l lg:border-t-0" : ""}`}
                >
                  <Eyebrow>{ship.label}</Eyebrow>
                  <p className="mt-2.5 font-semibold tracking-[-0.01em]">{ship.title}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Cloud vs self-host */}
        <section className="mx-auto max-w-6xl px-4 pt-28 sm:px-5 sm:pt-36">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="landing-reveal rounded-2xl border border-border bg-surface p-8">
              <Eyebrow>Cloud</Eyebrow>
              <h2 className="mt-3.5 text-[22px] font-semibold tracking-[-0.03em]">
                We run it. You get the alerts.
              </h2>
              <p className="mt-2.5 text-[14.5px] text-muted">
                Schedules, retries, alert delivery, workspaces and roles. Reaches
                public endpoints.
              </p>
              <div className="mt-6">
                <PrimaryCta>Start free</PrimaryCta>
              </div>
            </div>
            <div className="landing-reveal rounded-2xl border border-border bg-surface p-8">
              <Eyebrow>Self-host</Eyebrow>
              <h2 className="mt-3.5 text-[22px] font-semibold tracking-[-0.03em]">
                Every line is MIT.
              </h2>
              <p className="mt-2.5 text-[14.5px] text-muted">
                Run the whole app inside your network to watch APIs behind a VPN.
                Same features.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <GhostCta href="/docs/self-hosting">Self-hosting guide</GhostCta>
                <GhostCta href={GITHUB_URL}>View source</GhostCta>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="mx-auto max-w-6xl px-4 pt-28 sm:px-5 sm:pt-36">
          <h2 className={sectionTitle}>Start with the three that scare you.</h2>
          <p className="landing-reveal mt-4 text-[16.5px] text-muted">
            Free for 3 endpoints, forever. Yearly billing gets two months free.{" "}
            <Link href="/pricing" className="text-foreground underline underline-offset-4">
              View pricing
            </Link>
          </p>
          <ul className="landing-reveal mt-9 grid overflow-hidden rounded-2xl border border-border bg-surface sm:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((plan, i) => {
              const lines = plan.contactOnly
                ? ["Custom limits", "Arranged directly"]
                : [
                    `${plan.endpointLimit} endpoints`,
                    `${plan.checkQuota?.toLocaleString("en-US")} checks / mo`,
                    `${plan.seatLimit} ${plan.seatLimit === 1 ? "seat" : "seats"}, ${
                      planAllowsSchedules(plan.id) ? "schedules" : "manual checks"
                    }`,
                  ];
              return (
                <li
                  key={plan.id}
                  className={`p-7 ${plan.highlighted ? "bg-accent/[0.06]" : ""} ${
                    i > 0 ? "border-t border-white/[0.07]" : ""
                  } ${i === 1 ? "sm:border-l sm:border-t-0" : ""} ${
                    i === 2 ? "lg:border-l lg:border-t-0" : ""
                  } ${i === 3 ? "sm:border-l lg:border-t-0" : ""}`}
                >
                  <p className={`text-sm ${plan.highlighted ? "text-accent-on-wash" : "text-muted"}`}>
                    {plan.name}
                  </p>
                  <p className="mt-2.5 text-[40px] font-semibold leading-none tracking-[-0.04em]">
                    {plan.priceLabel}
                    {plan.period.startsWith("/") && (
                      <span className="text-sm font-normal tracking-normal text-muted-foreground/60">
                        {" "}
                        {plan.period.replace("/month", "/mo")}
                      </span>
                    )}
                  </p>
                  <p className="mt-4 font-mono text-[12.5px] leading-[1.9] text-muted">
                    {lines.map((line) => (
                      <span key={line} className="block">
                        {line}
                      </span>
                    ))}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-6xl px-4 pt-28 sm:px-5 sm:pt-36">
          <h2 className={sectionTitle}>Questions, answered.</h2>
          <div className="mt-10 max-w-3xl divide-y divide-border border-y border-border">
            {faqs.map((faq) => (
              <div key={faq.q} className="py-6">
                <h3 className="text-[17px] font-semibold tracking-[-0.01em]">{faq.q}</h3>
                <p className="aeo-answer mt-2 text-[15px] leading-relaxed text-muted">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section className="relative mt-32 border-t border-white/[0.06] sm:mt-36">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_45%_70%_at_50%_100%,rgba(79,127,255,0.16),transparent_70%)]"
          />
          <div className="relative mx-auto max-w-6xl px-4 py-28 text-center sm:px-5 sm:py-32">
            <div className="landing-reveal flex justify-center">
              <BrandLogo size={72} />
            </div>
            <h2 className="landing-reveal mx-auto mt-7 text-[clamp(2.4rem,6vw,4.6rem)] font-semibold leading-none tracking-[-0.05em]">
              Put a guard dog on
              <br />
              your integrations.
            </h2>
            <p className="landing-reveal mx-auto mt-5 max-w-md text-[17px] text-muted">
              Add your riskiest vendor endpoint. The first check runs in seconds.
            </p>
            <div className="landing-reveal mt-8 flex flex-wrap justify-center gap-3">
              <PrimaryCta>Start free</PrimaryCta>
              <GhostCta href={GITHUB_URL}>View source</GhostCta>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}

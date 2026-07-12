import Link from "next/link";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/chrome";

export const metadata = { title: "Documentation" };

const sections = [
  {
    title: "Getting started",
    items: [
      ["Quickstart", "Create a workspace, add an endpoint, capture a baseline, run a check."],
      ["Concepts", "Baselines, diffs, severity, ignore rules, and schedules."],
    ],
  },
  {
    title: "Guides",
    items: [
      ["Auth types", "Bearer, API key, Basic, OAuth, and custom headers."],
      ["OpenAPI import", "Upload JSON/YAML or paste a URL for bulk import."],
      ["Alerting", "Slack, Discord, email, webhooks with severity filters."],
    ],
  },
  {
    title: "Reference",
    items: [
      ["CLI", "apidiff login · add · check · baseline · diff · monitor · import"],
      ["REST API", "API keys, webhooks, and programmatic checks."],
    ],
  },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <main className="mx-auto grid max-w-6xl gap-12 px-5 py-16 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-6 text-sm">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted">
              Docs
            </div>
            <nav className="mt-3 space-y-1.5">
              <Link href="/docs" className="block text-foreground">
                Overview
              </Link>
              <Link href="/docs/cli" className="block text-muted hover:text-foreground">
                CLI
              </Link>
              <Link href="/docs/api" className="block text-muted hover:text-foreground">
                API
              </Link>
            </nav>
          </div>
        </aside>
        <article className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight">Documentation</h1>
          <p className="mt-3 text-muted leading-relaxed">
            Everything you need to monitor APIs, review diffs, and wire checks
            into CI.
          </p>

          <div className="mt-12 space-y-12">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-lg font-medium">{section.title}</h2>
                <ul className="mt-4 divide-y divide-border border-y border-border">
                  {section.items.map(([title, body]) => (
                    <li key={title} className="py-4">
                      <h3 className="text-sm font-medium">{title}</h3>
                      <p className="mt-1 text-sm text-muted">{body}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <pre className="mt-12 overflow-x-auto rounded-lg border border-border bg-surface p-4 font-mono text-xs text-muted">
            <code>{`# Capture baseline then check
npx apidiff baseline --endpoint ep_users
npx apidiff check --endpoint ep_users --fail-on breaking`}</code>
          </pre>
        </article>
      </main>
      <MarketingFooter />
    </div>
  );
}

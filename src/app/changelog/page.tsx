import type { Metadata } from "next";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/chrome";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Changelog — Product Updates",
  description:
    "Release notes for APIDiffGuard: Diff Viewer, baselines, schedules, alerts, CLI, and free JSON tools.",
  path: "/changelog",
});

const entries = [
  {
    version: "0.1.0",
    date: "Jul 12, 2026",
    items: [
      "Signature side-by-side Diff Viewer with JSON trees and keyboard nav",
      "Endpoint management, baselines, schedules, and alert history",
      "Command palette (⌘K) and IDE-style console shell",
      "Fumadocs documentation and blog",
      "Free JSON Diff, Formatter, and Validator tools",
      "CLI and REST API documentation",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <main className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">Changelog</h1>
        <p className="mt-3 text-muted">
          What shipped in APIDiffGuard — newest first.
        </p>
        <div className="mt-12 space-y-12">
          {entries.map((e) => (
            <article key={e.version}>
              <div className="flex items-baseline gap-3">
                <h2 className="text-lg font-medium">v{e.version}</h2>
                <time className="text-xs text-muted">{e.date}</time>
              </div>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted">
                {e.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}

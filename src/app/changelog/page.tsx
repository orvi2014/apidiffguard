import { MarketingFooter, MarketingHeader } from "@/components/marketing/chrome";

export const metadata = { title: "Changelog" };

const entries = [
  {
    version: "0.1.0",
    date: "Jul 12, 2026",
    items: [
      "Signature side-by-side Diff Viewer with JSON trees and keyboard nav",
      "Endpoint management, baselines, schedules, and alert history",
      "Command palette (⌘K) and IDE-style console shell",
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
        <p className="mt-3 text-muted">What shipped, newest first.</p>
        <div className="mt-12 space-y-12">
          {entries.map((e) => (
            <article key={e.version}>
              <div className="flex items-baseline gap-3">
                <h2 className="font-mono text-sm text-accent">v{e.version}</h2>
                <time className="text-xs text-muted-foreground">{e.date}</time>
              </div>
              <ul className="mt-4 space-y-2">
                {e.items.map((item) => (
                  <li
                    key={item}
                    className="flex gap-2 text-sm text-muted leading-relaxed"
                  >
                    <span className="mt-2 size-1 shrink-0 rounded-full bg-border" />
                    {item}
                  </li>
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

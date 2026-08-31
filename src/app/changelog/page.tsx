import type { Metadata } from "next";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/chrome";
import { loadChangelog } from "@/lib/changelog";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Changelog — Product Updates",
  description:
    "Release notes for APIDiffGuard: Diff Viewer, baselines, schedules, alerts, CLI, and free JSON tools.",
  path: "/changelog",
});

export default function ChangelogPage() {
  const entries = loadChangelog();

  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <main id="main" className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">Changelog</h1>
        <p className="mt-3 text-muted">
          What shipped in APIDiffGuard — newest first. Source:{" "}
          <code className="text-xs">CHANGELOG.md</code>.
        </p>
        <div className="mt-12 space-y-12">
          {entries.map((e) => (
            <article key={e.version}>
              <div className="flex flex-wrap items-baseline gap-3">
                <h2 className="text-lg font-medium">
                  {e.version === "Unreleased" ? "Unreleased" : `v${e.version}`}
                </h2>
                {e.date ? (
                  <time className="text-xs tabular-nums text-muted">
                    {e.date}
                  </time>
                ) : e.version === "Unreleased" ? (
                  <span className="text-xs text-muted">
                    shipped, not yet versioned
                  </span>
                ) : null}
              </div>
              <div className="mt-4 space-y-5">
                {e.groups.map((group) => (
                  <div key={group.heading ?? "ungrouped"}>
                    {group.heading ? (
                      <h3 className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
                        {group.heading}
                      </h3>
                    ) : null}
                    <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-muted">
                      {group.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}

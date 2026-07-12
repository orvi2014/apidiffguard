import type { Metadata } from "next";
import Link from "next/link";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/chrome";
import { JsonDiffTool } from "@/components/tools/json-diff-tool";
import { ProductCta, ToolFaq } from "@/components/tools/product-cta";

export const metadata: Metadata = {
  title: "JSON Diff Online — Compare JSON Side by Side",
  description:
    "Free online JSON diff tool. Paste two JSON documents and compare fields, types, and values instantly. Built by APIDiffGuard.",
  openGraph: {
    title: "JSON Diff Online — Compare JSON Side by Side",
    description:
      "Free online JSON compare tool. See added, removed, and changed fields with severity.",
  },
};

export default function JsonDiffPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <main className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/tools" className="hover:text-foreground">
            Tools
          </Link>
          <span>/</span>
          <span className="text-foreground">JSON Diff</span>
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          JSON Diff
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground leading-relaxed">
          Compare two JSON documents online. Spot added, removed, and changed
          fields — the same engine APIDiffGuard uses for API response drift.
        </p>

        <div className="mt-10">
          <JsonDiffTool />
        </div>

        <ProductCta title="Need automatic API change monitoring?" />

        <ToolFaq
          items={[
            {
              q: "How do I compare JSON online?",
              a: "Paste the original JSON on the left and the new JSON on the right. The diff updates as soon as both sides are valid.",
            },
            {
              q: "Is this JSON diff free?",
              a: "Yes. The browser-based JSON Diff tool is free and does not require an account. Monitoring live APIs over time is what APIDiffGuard productizes.",
            },
            {
              q: "What is the difference between a JSON diff and API monitoring?",
              a: "A JSON diff compares two static payloads once. APIDiffGuard captures a baseline response, re-checks the endpoint on a schedule, and alerts when the live response drifts.",
            },
          ]}
        />
      </main>
      <MarketingFooter />
    </div>
  );
}

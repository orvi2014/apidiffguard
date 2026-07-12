import type { Metadata } from "next";
import Link from "next/link";
import { Braces, FileJson, GitCompare } from "lucide-react";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/chrome";
import { ProductCta } from "@/components/tools/product-cta";

export const metadata: Metadata = {
  title: "Free JSON Tools — Diff, Format, Validate",
  description:
    "Free online JSON diff, formatter, and validator. Compare JSON side by side, pretty-print, and validate syntax — then monitor API drift with APIDiffGuard.",
};

const tools = [
  {
    href: "/tools/json-diff",
    title: "JSON Diff",
    body: "Compare two JSON documents side by side. See added, removed, and changed fields with severity.",
    icon: GitCompare,
  },
  {
    href: "/tools/json-formatter",
    title: "JSON Formatter",
    body: "Pretty-print or minify JSON in the browser. Fix messy payloads before you paste them into a check.",
    icon: Braces,
  },
  {
    href: "/tools/json-validator",
    title: "JSON Validator",
    body: "Validate JSON syntax instantly and get a clear parse error when something is wrong.",
    icon: FileJson,
  },
];

export default function ToolsIndexPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <main className="mx-auto max-w-6xl px-5 py-16">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">
          Free tools
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          JSON tools for developers who ship APIs.
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground leading-relaxed">
          Diff, format, and validate JSON online — no account required. When you
          need continuous API monitoring, APIDiffGuard captures baselines and
          alerts on drift.
        </p>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="rounded-lg border border-border bg-surface p-6 transition-colors hover:border-[#3f3f46]"
            >
              <tool.icon className="size-5 text-accent" strokeWidth={1.5} />
              <h2 className="mt-4 text-base font-medium">{tool.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {tool.body}
              </p>
            </Link>
          ))}
        </div>

        <ProductCta />
      </main>
      <MarketingFooter />
    </div>
  );
}

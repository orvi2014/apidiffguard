import type { Metadata } from "next";
import Link from "next/link";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/chrome";
import { JsonFormatterTool } from "@/components/tools/json-formatter-tool";
import { ProductCta, ToolFaq } from "@/components/tools/product-cta";

export const metadata: Metadata = {
  title: "JSON Formatter — Pretty Print & Minify JSON Online",
  description:
    "Free JSON formatter and beautifier. Pretty-print or minify JSON in your browser. From the makers of APIDiffGuard.",
};

export default function JsonFormatterPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <main className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/tools" className="hover:text-foreground">
            Tools
          </Link>
          <span>/</span>
          <span className="text-foreground">JSON Formatter</span>
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          JSON Formatter
        </h1>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          Pretty-print or minify JSON instantly. Useful before pasting payloads
          into a diff, baseline, or API check.
        </p>
        <div className="mt-10">
          <JsonFormatterTool />
        </div>
        <ProductCta />
        <ToolFaq
          items={[
            {
              q: "Can I minify JSON online?",
              a: "Yes. Click Minify to collapse whitespace, or Pretty print to expand with 2 or 4 space indentation.",
            },
            {
              q: "Does formatting change my data?",
              a: "No. Formatting only changes whitespace. Invalid JSON will show a parse error instead of rewriting the value.",
            },
          ]}
        />
      </main>
      <MarketingFooter />
    </div>
  );
}

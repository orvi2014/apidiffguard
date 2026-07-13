import type { Metadata } from "next";
import Link from "next/link";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/chrome";
import { JsonValidatorTool } from "@/components/tools/json-validator-tool";
import { ProductCta, ToolFaq } from "@/components/tools/product-cta";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbJsonLd, buildMetadata, faqJsonLd } from "@/lib/seo";

const faqs = [
  {
    q: "How do I validate JSON online?",
    a: "Paste your JSON into the editor. If it parses, you’ll see Valid JSON. If not, the parser error message is shown.",
  },
  {
    q: "Is JSON validation the same as schema validation?",
    a: "This tool checks syntax only. Schema / contract checks against a live API baseline are what APIDiffGuard monitors over time.",
  },
];

export const metadata: Metadata = buildMetadata({
  title: "JSON Validator — Check JSON Syntax Online Free",
  description:
    "Free online JSON validator. Paste JSON and instantly check for syntax errors. Built by APIDiffGuard.",
  path: "/tools/json-validator",
});

export default function JsonValidatorPage() {
  return (
    <div className="min-h-screen">
      <JsonLd
        data={[
          faqJsonLd(faqs),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Tools", path: "/tools" },
            { name: "JSON Validator", path: "/tools/json-validator" },
          ]),
        ]}
      />
      <MarketingHeader />
      <main id="main" className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/tools" className="hover:text-foreground">
            Tools
          </Link>
          <span>/</span>
          <span className="text-foreground">JSON Validator</span>
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Free JSON Validator Online
        </h1>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          Validate JSON syntax in your browser. Catch missing commas, trailing
          commas, and malformed strings before they break a client.
        </p>
        <div className="mt-10">
          <JsonValidatorTool />
        </div>
        <ProductCta />
        <ToolFaq items={faqs} />
      </main>
      <MarketingFooter />
    </div>
  );
}

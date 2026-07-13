import type { Metadata } from "next";
import Link from "next/link";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/chrome";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Privacy Policy",
  description:
    "How APIDiffGuard collects, uses, and protects account and monitoring data.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <main id="main" className="mx-auto max-w-3xl px-5 py-16">
        <p className="text-xs text-muted-foreground">Last updated: July 12, 2026</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Privacy Policy</h1>
        <div className="prose prose-neutral dark:prose-invert mt-8 max-w-none text-sm leading-relaxed text-muted-foreground">
          <p>
            APIDiffGuard (&quot;we&quot;, &quot;us&quot;) provides API monitoring and free
            developer tools at{" "}
            <Link href="/">apidiffguard.com</Link>. This policy explains what we
            collect and why.
          </p>
          <h2>Information we collect</h2>
          <ul>
            <li>Account data: email, name, workspace name when you register.</li>
            <li>
              Product data: endpoint URLs, baselines, check results, and alert
              settings you configure.
            </li>
            <li>
              Usage data: basic request logs and diagnostics needed to operate
              the service.
            </li>
            <li>
              Free tools: JSON pasted into browser tools is processed in your
              browser for local diffs; we do not require an account for those
              pages.
            </li>
          </ul>
          <h2>How we use data</h2>
          <p>
            We use data to provide monitoring, authenticate users, improve
            reliability, and communicate about the product. We do not sell
            personal data.
          </p>
          <h2>Processors</h2>
          <p>
            We use infrastructure providers such as Vercel (hosting) and
            Supabase (auth/database). They process data under their own terms
            to run the service.
          </p>
          <h2>Retention & deletion</h2>
          <p>
            Account and monitoring data is retained while your workspace is
            active. Contact us to request deletion of your account data.
          </p>
          <h2>Contact</h2>
          <p>
            Questions: open an issue on{" "}
            <a href="https://github.com/orvi2014/apidiffguard">GitHub</a> or
            email the project maintainers listed in the repository.
          </p>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}

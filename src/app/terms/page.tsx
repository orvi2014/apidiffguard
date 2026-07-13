import type { Metadata } from "next";
import Link from "next/link";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/chrome";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Terms of Service",
  description:
    "Terms for using APIDiffGuard Cloud, free tools, and the open-source repository.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <main id="main" className="mx-auto max-w-3xl px-5 py-16">
        <p className="text-xs text-muted-foreground">Last updated: July 12, 2026</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Terms of Service</h1>
        <div className="prose prose-neutral dark:prose-invert mt-8 max-w-none text-sm leading-relaxed text-muted-foreground">
          <p>
            By using APIDiffGuard Cloud or the free tools on this site, you agree
            to these terms.
          </p>
          <h2>Service</h2>
          <p>
            APIDiffGuard provides API monitoring features and free browser-based
            JSON tools. The hosted Cloud product may change as we ship
            improvements. Open-source components are licensed separately under
            MIT as described in the repository{" "}
            <Link href="https://github.com/orvi2014/apidiffguard">LICENSE</Link>.
          </p>
          <h2>Accounts</h2>
          <p>
            You are responsible for credentials and for endpoint URLs you
            configure. Do not use the service to probe systems you are not
            authorized to access.
          </p>
          <h2>Acceptable use</h2>
          <ul>
            <li>No abuse of rate limits or infrastructure.</li>
            <li>No unlawful monitoring or credential stuffing.</li>
            <li>No reverse-engineering that violates applicable law.</li>
          </ul>
          <h2>Disclaimer</h2>
          <p>
            The service is provided &quot;as is&quot; without warranties.
            Monitoring gaps can occur; do not rely on APIDiffGuard as your only
            production safety control.
          </p>
          <h2>Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, APIDiffGuard is not liable
            for indirect or consequential damages arising from use of the
            service.
          </p>
          <h2>Contact</h2>
          <p>
            For questions, use{" "}
            <a href="https://github.com/orvi2014/apidiffguard/issues">GitHub Issues</a>
            .
          </p>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}

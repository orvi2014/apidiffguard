import Link from "next/link";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/chrome";

export const metadata = { title: "API" };

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <main className="mx-auto max-w-3xl px-5 py-16">
        <Link href="/docs" className="text-xs text-muted hover:text-foreground">
          ← Docs
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">REST API</h1>
        <p className="mt-3 text-muted">
          Authenticate with an API key header. Base URL{" "}
          <code className="font-mono text-foreground">https://api.apidiffguard.com/v1</code>
        </p>

        <div className="mt-10 space-y-8">
          {[
            ["POST /endpoints", "Create an endpoint"],
            ["POST /endpoints/:id/baseline", "Capture baseline"],
            ["POST /endpoints/:id/check", "Run check"],
            ["GET /endpoints/:id/diffs", "List diffs"],
            ["POST /webhooks", "Register inbound webhook"],
          ].map(([path, desc]) => (
            <div key={path} className="border-b border-border pb-6">
              <code className="font-mono text-sm text-accent">{path}</code>
              <p className="mt-1 text-sm text-muted">{desc}</p>
            </div>
          ))}
        </div>

        <pre className="mt-10 overflow-x-auto rounded-lg border border-border bg-surface p-4 font-mono text-xs leading-relaxed text-muted">
          <code>{`curl -X POST https://api.apidiffguard.com/v1/endpoints/ep_users/check \\
  -H "Authorization: Bearer adg_live_…" \\
  -H "Content-Type: application/json"`}</code>
        </pre>
      </main>
      <MarketingFooter />
    </div>
  );
}

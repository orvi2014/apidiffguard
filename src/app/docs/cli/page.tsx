import Link from "next/link";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/chrome";

export const metadata = { title: "CLI" };

const commands = [
  ["apidiff login", "Authenticate the CLI with a browser or API token."],
  ["apidiff add", "Register an endpoint from URL + method."],
  ["apidiff baseline", "Capture and optionally approve a baseline."],
  ["apidiff check", "Run a check against the active baseline."],
  ["apidiff diff", "Print the latest diff summary to stdout."],
  ["apidiff monitor", "Daemon mode for local continuous checks."],
  ["apidiff import", "Import endpoints from an OpenAPI document."],
];

export default function CliDocsPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <main className="mx-auto max-w-3xl px-5 py-16">
        <Link href="/docs" className="text-xs text-muted hover:text-foreground">
          ← Docs
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">CLI</h1>
        <p className="mt-3 text-muted">
          Install with npm and run the same engine as the console.
        </p>
        <pre className="mt-8 rounded-lg border border-border bg-surface p-4 font-mono text-sm text-foreground">
          <code>npm i -g @apidiffguard/cli</code>
        </pre>
        <ul className="mt-10 divide-y divide-border border-y border-border">
          {commands.map(([cmd, desc]) => (
            <li key={cmd} className="py-4">
              <code className="font-mono text-sm text-accent">{cmd}</code>
              <p className="mt-1 text-sm text-muted">{desc}</p>
            </li>
          ))}
        </ul>
      </main>
      <MarketingFooter />
    </div>
  );
}

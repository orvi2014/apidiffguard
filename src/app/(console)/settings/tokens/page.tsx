import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = { title: "API tokens" };

export default function TokensPage() {
  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h2 className="text-base font-medium">API tokens</h2>
        <p className="mt-1 text-sm text-muted">
          Authenticate the CLI and REST API.
        </p>
      </div>

      <div className="rounded-md border border-border bg-surface px-4 py-6 text-center">
        <p className="text-sm text-muted">
          Personal access tokens are not available yet. Use the console while
          signed in, or self-host with your own credentials.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button asChild size="sm" variant="secondary">
            <Link href="/docs/cli">CLI docs</Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href="/settings/billing">Billing</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
